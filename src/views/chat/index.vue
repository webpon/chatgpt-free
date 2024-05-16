<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NCard, NDivider, NInput, useDialog, useMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, useKeyStore, usePromptStore } from '@/store'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'

let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()
const keyStore = useKeyStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

function handleSubmit() {
  onConversation()
}

async function onConversation() {
  let message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions
  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    // let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        type: keyStore.type,
        signal: controller.signal,
        chatKey: keyStore.chatKey,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          // const lastIndex = responseText.lastIndexOf('\n')
          const arr = responseText.split('&KFw6loC2329Qvy&')
          // let chunk = responseText
          // if (lastIndex !== -1)
          //   chunk = responseText.substring(lastIndex)
          try {
            // const data = JSON.parse(chunk)
            if (arr[0] === 'image') {
              updateChat(
                +uuid,
                dataSources.value.length - 1,
                {
                  dateTime: new Date().toLocaleString(),
                  text: `![Alt text](${arr[1] || ''})`,
                  inversion: false,
                  error: false,
                  loading: false,
                  conversationOptions: { conversationId: '1', parentMessageId: '1' },
                  requestOptions: { prompt: message, options: { ...options } },
                },
              )
            }
            else {
              const data = JSON.parse(arr[0])
              const lastData = arr[2] && JSON.parse(arr[2])
              updateChat(
                +uuid,
                dataSources.value.length - 1,
                {
                  dateTime: new Date().toLocaleString(),
                  text: arr[1] || '',
                  inversion: false,
                  error: false,
                  loading: false,
                  conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                  requestOptions: { prompt: message, options: { ...options } },
                },
              )

              if (openLongReply && lastData && lastData.detail.choices[0].finish_reason === 'stop') {
                options.parentMessageId = lastData.id
                // lastText = data.text
                message = ''
                return fetchChatAPIOnce()
              }
            }

            scrollToBottom()
          }
          catch (error) {
            //
          }
        },
      })
    }

    await fetchChatAPIOnce()
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n${errorMessage}`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    +uuid,
    index,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, ...options },
    },
  )

  try {
    // let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        type: keyStore.type,
        signal: controller.signal,
        chatKey: keyStore.chatKey,
        onDownloadProgress: async ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          // const lastIndex = responseText.lastIndexOf('\n')
          // let chunk = responseText
          // if (lastIndex !== -1)
          //   chunk = responseText.substring(lastIndex)
          const arr = responseText.split('&KFw6loC2329Qvy&')
          try {
            if (arr[0] === 'image') {
              updateChat(
                +uuid,
                dataSources.value.length - 1,
                {
                  dateTime: new Date().toLocaleString(),
                  text: `![Alt text](${arr[1] || ''})`,
                  inversion: false,
                  error: false,
                  loading: false,
                  conversationOptions: { conversationId: '1', parentMessageId: '1' },
                  requestOptions: { prompt: message, options: { ...options } },
                },
              )
            }
            else {
              // const data = JSON.parse(chunk)
              const data = JSON.parse(arr[0])
              const lastData = arr[2] && JSON.parse(arr[2])
              updateChat(
                +uuid,
                index,
                {
                  dateTime: new Date().toLocaleString(),
                  text: arr[1] || '',
                  inversion: false,
                  error: false,
                  loading: false,
                  conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                  requestOptions: { prompt: message, ...options },
                },
              )

              if (openLongReply && lastData && lastData.detail.choices[0].finish_reason === 'stop') {
                options.parentMessageId = lastData.id
                // lastText = data.text
                message = ''
                return fetchChatAPIOnce()
              }
            }
          }
          catch (error) {
            //
          }
        },
      })
    }
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChat(
      +uuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, ...options },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent v-if="isMobile" :using-context="usingContext" @export="handleExport" @handle-clear="handleClear" />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div
          id="image-wrapper" class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-2']"
        >
          <template v-if="!dataSources.length">
            <div class="flex items-center justify-center text-center text-neutral-300">
              <!-- <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
              <span>Aha~</span> -->
              <NCard
                style="width: 100%; margin-top: -20px;" :bordered="false" size="huge" role="dialog"
                aria-modal="true"
              >
                <div class="text-center flex items-center flex-col">
                  <h3 class="text-orange-400 text-3xl my-1 font-bold">
                    <span class="text-red-500 title">本网站永久免费</span><br>
                  </h3>
                  <div>
                    <div><b style="color:red;">二维码是自愿捐赠！请确保网站您能使用，并且用了很久觉得好再捐赠！网站完全免费，就算不捐，站长也会自费运营网站！网站成本平均一人一月大概3元，只要每月捐三元 网站就能活下去</b></div>
                    <div>PS: 所有捐赠将用于维护免费站运行</div>
                    <div><b>收藏导航站不迷路</b>: <a target="_blank" href="https://good.xjai.top/" style="color: #2979ff;">https://good.xjai.top</a></div>
                    <div>禁止发布、传播任何违法、违规内容，使用本网站，视您接受并同意<a target="_blank" style="color:#006eff;" href="https://docs.qq.com/doc/DVFdaY1lvWHFSWU5w">《免责声明》</a></div>
                    <!-- <div><b style="color:red;">📢此处为公告: 目前openai账号暴涨几十倍，但目前本站仍提供免费使用，维持现在的用户使用每日需要花上万元购买账号，现存账号转手卖还值6万块但只够维持免费6天不到，可能6天内免费服务就将暂停，站长也不准备开展收费服务</b></div> -->
                    <div
                      style="
                          display: flex;
                          align-items: center;
                          justify-content: center;
                    "
                    >
                      <img class="mr-4" src="https://file.xjai.top/uploads/2023-12-10-1702225292439-50015283-%C3%A5%C2%BE%C2%AE%C3%A4%C2%BF%C2%A1%C3%A5%C2%9B%C2%BE%C3%A7%C2%89%C2%87_20231211002121.jpg" width="200" height="150" alt="kele">
                      <img src="https://file.xjai.top/uploads/2024-03-05-1709624710051-19510611-2024-03-05-1709624594831-21220475-image.jpg" width="200" height="100" alt="kele">
                    </div>

                    <span style="display: none">https://api.binjie.fun/api/generateStream</span>
                  </div>
                  <!-- <h3 class="leading-8 text-xl">
                    请务必收藏导航页： <a
                      href="https://good.xjai.top" class="text-blue-500 underline"
                      target="_blank"
                    >https://good.xjai.top</a>
                  </h3> -->

                  <!-- <span class="leading-10 text-xl text-red-500 font-bold">请务必收藏导航页：<a class="underline text-blue-500" href="http://a.x-code.fun">https://a.x-code.fun</a></span><br> -->

                  <!-- <h3 class="text-xl leading-8">
                    高级稳定版本<span class="text-red-500">(广告)</span>
                    <a
                      href="https://srv.aiflarepro.com/#/ask_answer?cid=4111" class="text-blue-500 underline"
                      target="_blank"
                    >https://srv.aiflarepro.com/#/ask_answer?cid=4111</a>
                  </h3> -->
                  <!-- <span class="text-base">此版本为免费体验版，高级高级版本请访问：<a class="underline text-blue-500" href="https://p1.xjai.pro">https://p1.xjai.pro</a></span><br> -->
                  <NDivider class="!my-1" />
                  <h3 class="text-xl leading-8">
                    站长推荐<span class="text-red-500">(广告)</span>：<br>
                    本站点同款<span class="text-red-500">服务器</span>，性价比超高，仅10元一个月，送免费域名、ssl证书<br>
                    <a
                      href="https://www.rainyun.com/webpon_" class="text-blue-500 underline"
                      target="_blank"
                    >https://www.rainyun.com/webpon</a>
                  </h3>
                </div>
              </NCard>
            </div>
          </template>
          <template v-else>
            <div>
              <Message
                v-for="(item, index) of dataSources" :key="index" :date-time="item.dateTime" :text="item.text"
                :inversion="item.inversion" :error="item.error" :loading="item.loading" @regenerate="onRegenerate(index)"
                @delete="handleDelete(index)"
              />
              <div class="sticky bottom-0 left-0 flex justify-center">
                <NButton v-if="loading" type="warning" @click="handleStop">
                  <template #icon>
                    <SvgIcon icon="ri:stop-circle-line" />
                  </template>
                  {{ t('common.stopResponding') }}
                </NButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <HoverButton @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef" v-model:value="prompt" type="textarea" :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }" @input="handleInput" @focus="handleFocus"
                @blur="handleBlur" @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>

<style lang="less" scoped>
.title {
  background: -webkit-linear-gradient(red, blue);
    -webkit-background-clip: text;
    color: transparent;
}
</style>
