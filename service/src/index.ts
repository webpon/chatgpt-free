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
    // * GPT4免费无限制(广告)：[gpt4](http://gnomic.x-code.fun)
    // requests[key] = requests[key].filter(timestamp => timestamp > (currentTimestamp - windowMs))
    // 服务器昂贵,接口昂贵,但网站免费！！你的捐款是我坚持下去的动力！
    if (requests[key].length % 4 === 0) {
      tips = `\n_______________________\n
支付宝放水了，支付宝扫码领红包！
      ![赞赏码](https://file.xjai.top/uploads/2023-11-30-1701363862391-31237133-5e4f8ca579fab96c5e8b0d0affc8c99.jpg)
* 国内稳定高级版本1(广告)：[动点AI](https://p1.xjai.pro)
* 国内稳定高级版本2(广告)：[YAI](http://yk.x-code.fun)
* 国内稳定高级版本3(广告)：[ChatAI中文](https://srv.aiflarepro.com/#/?cid=4111)
 `
    }
    else {
//       tips = `\n_______________________\n
// * 防止迷路，请务必收藏导航页：[永久导航页](http://a.x-code.fun)`
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
      Knowledge cutoff: 2021-03
      Current model: gpt-3.5-turbo-16k
      Current time: ${new Date().toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')}
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
