import http from 'node:http'

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('Bot running')
})

const PORT = process.env.PORT || 3000
server.listen(PORT)