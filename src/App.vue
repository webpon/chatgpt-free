<script setup lang="ts">
import { NCard, NConfigProvider, NDivider, NModal } from 'naive-ui'
import { ref } from 'vue'
import { NaiveProvider } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const announcementModal = ref(true)
</script>

<template>
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <NaiveProvider>
      <RouterView />
    </NaiveProvider>
  </NConfigProvider>
  <NModal v-model:show="announcementModal">
    <NCard
      style="width: 600px" title="公告栏" closable :bordered="false" size="huge" role="dialog" aria-modal="true"
      @close="announcementModal = false"
    >
      <div class="text-center flex items-center flex-col">
        <template v-if="false">
          <h3 class="text-orange-400 text-3xl my-1 font-bold">
            <span class="text-red-500">重要通知📢</span><br>
          </h3>

          <h3 class="leading-8 text-small">
            目前openai账号暴涨几十倍，但目前本站仍提供免费使用，维持现在的用户使用每日需要花上万元购买账号，现存账号转手卖还值6万块但只够维持免费6天不到，如果没有便宜稳定的购买账号渠道，可能6天内免费服务就将暂停站长也不准备开展收费服务，
            <p style="color:red;">但站长的服务仍在继续，站长将运营导航站，收集一些优质免费稳定的AI网站，有需要的请收藏导航页： <a
              href="https://good.xjai.top" class="text-blue-500 underline"
              target="_blank"
            >https://good.xjai.top</a></p>
          </h3>
        </template>
        <!-- <h3 class="text-xl leading-8 font-bold">支付宝大红包来了！</h3>
        <img class="w-[200px]" src="https://file.xjai.top/uploads/2024-04-24-1713980537868-23089102-WechatIMG10833.png"/> -->
        <!-- <NDivider class="!my-1" /> -->
        <!-- <h3>号暂时用完了，站长正在处理，期间可使用<a
            href="https://good.xjai.top" class="text-blue-500 underline"
            target="_blank"
          >https://good.xjai.top</a> 免费ai导航站其他网站</h3> -->
          <h2>本站支持GPT4o模型，免费使用，一分钟可用3次</h2>
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
  </NModal>
</template>
