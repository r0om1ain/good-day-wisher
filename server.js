import http from 'node:http'

export function startHttpServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200)
    res.end('OK')
  })

  const port = Number(process.env.PORT || 3000)
  server.listen(port, '0.0.0.0', () => {
    console.log(`HTTP listening on ${port}`)
  })
}