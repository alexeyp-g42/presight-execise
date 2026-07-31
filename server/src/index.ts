/* Placeholder bootstrap, here only so the dev loop and the build have an entry
   point. #17 replaces it: the app becomes a `createApp(db)` factory and the
   listening bootstrap moves out of the same file. Do not grow this. */
import express from 'express'

const port = Number(process.env.PORT ?? 3000)

const app = express()

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})
