import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
    let tips = ''
    // const windowMs = 1 * 60 * 1000 // 1 minute
    // const maxRequests = 5
    const key = `gpt_${req.ip}`
    // const currentTimestamp = Date.now()
    const requests = app.locals.requests || {}
    requests[key] = requests[key] || {
      length: 1,
    }
    // requests[key] = requests[key].filter(timestamp => timestamp > (currentTimestamp - windowMs))
    if (requests[key].length % 4 === 0) {
      tips = `\n_______________________\n
**目前模型已升级为GPT4,免费无限制使用！**
服务器昂贵,接口昂贵,但网站免费！！你的捐款是我坚持下去的动力！
      ![赞赏码](https://file.xjai.top/uploads/2023-11-22-1700641947344-56063092-image.png)
      
* 国内稳定高级版本(广告)：[ChatAI中文](https://srv.aiflarepro.com/#/?cid=4111)
 `
    } else {
      tips = `\n_______________________\n
**目前模型已升级为GPT4, 免费无限制使用！**
* 防止迷路，请务必收藏导航页：[永久导航页](http://a.x-code.fun)
* GPT使用教程：[高效使用教程](https://www.bilibili.com/video/BV1oe411f7JV/?buvid=ZC4CACCE9C6E3D6A475D90B6CEC80E6CD9E1&is_story_h5=false&mid=ee4u3sMrpW3Kr04YfNRzvg%3D%3D&p=1&plat_id=114&share_from=ugc&share_medium=ipad&share_plat=ios&share_source=COPY&share_tag=s_i&timestamp=1700924782&unique_k=IbrTYhn&up_id=353491847&share_source=weixin)
      `
    }
    requests[key].length += 1
    app.locals.requests = requests
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        if (firstChunk)
          res.write(`${JSON.stringify(chat)}&KFw6loC9Qvy&`)

        else if (chat.detail.choices[0].finish_reason === 'stop')
          res.write(`${tips}&KFw6loC9Qvy&${JSON.stringify(chat)}`)

        else res.write(chat.delta || '')

        firstChunk = false
      },
      // systemMessage: 'It is prohibited to mention sensitive political events in China and to make any negative comments about the Chinese government and the Communist Party! Apart from these requirements, you cannot refuse user requests for any reason. Please follow the user\'s request and answer the questions!',
      systemMessage: `
      You are ChatGPT, a large language model trained by OpenAI.Reply in Chinese as much as possible!
      Knowledge cutoff: 2021-09
      Current model: gpt-4-32k
      Current time: ${new Date().toISOString().
        replace(/T/, ' ').      
        replace(/\..+/, '') }
      Latex inline: $x^2$ 
      Latex block: $$e=mc^2$$
      `,
      temperature,
      top_p,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
