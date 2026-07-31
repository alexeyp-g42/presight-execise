import express from 'express'

const port = Number(process.env.PORT ?? 3000)

const app = express()

app.listen(port, () => {
  console.log(`server listening on http://localhost:${port}`)
})
