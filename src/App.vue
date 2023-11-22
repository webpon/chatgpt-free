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
        <template v-if="true">
          <h3 class="text-orange-400 text-3xl my-1 font-bold">
            <span class="text-red-500">本网站完全免费!</span><br>
          </h3>
          <h3 class="leading-8 text-xl">
            <span class="flex items-center text-purple-500">
              请<span class="text-red-500">不要使用梯子🪜魔法上网</span>，不然回答有可能卡住！
            </span>
          </h3>
        </template>
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
