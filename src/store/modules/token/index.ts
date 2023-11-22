import { defineStore } from 'pinia'
import { getLocalState, setLocalState } from './helper'

export const useKeyStore = defineStore('key-store', {
  state: () => getLocalState(),
  actions: {

    // updateUserInfo(userInfo: Partial<UserInfo>) {
    //   this.userInfo = { ...this.userInfo, ...userInfo }
    //   this.recordState()
    // },

    setChatKey (key: string) {
      this.chatKey = key
      setLocalState(key)
    },
    setServer (api: string) {
      this.serverUrl = api
    },

    setType (type: string) {
      this.type = type
    },
    setDownloadUrl (info: any) {
      if(info.winurl)
      this.versionInfo.winurl = info.winurl
      if(info.macurl)
      this.versionInfo.macurl = info.macurl
      if(info.macurl_intel)
      this.versionInfo.macurl_intel = info.macurl_intel 
      if(info.android_url)
      this.versionInfo.android_url = info.android_url
      if(info.ios_url)
      this.versionInfo.ios_url = info.ios_url
    },

  },
})
