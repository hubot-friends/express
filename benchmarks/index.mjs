
import express from '../index.js'
import autocannon from 'autocannon'
import prettyBytes from 'pretty-bytes'
import fs from 'node:fs'

const toMs = (ns) => {
    return `${Math.floor(ns * 100) / 100} ms`;
}
const format = (ns) => {
    return ns.toLocaleString({minimumFractionDigits: 2, maximumFractionDigits: 2})
}

const toTable = (data) => {
    const { latency, requests, throughput } = data
    const latencyTable = `
| Stat | 2.5% | 50% | 97.5% | 99% | Avg | Stdev | Max |
|:-----|:----:|:---:|:-----:|:---:|:---:|:-----:|:---:|
| Latency | ${toMs(latency.p2_5)} | ${toMs(latency.p50)} | ${toMs(latency.p97_5)} | ${toMs(latency.p99)} | ${toMs(latency.average)} | ${toMs(latency.stddev)} | ${toMs(latency.max)} |
`
    const rateTable = `
| Stat | 1% | 2.5% | 50% | 97.5% | Avg | Stdev | Min |
|:-----|:--:|:----:|:---:|:-----:|:---:|:-----:|:---:|
| Req/Sec | ${format(requests.p1)} | ${format(requests.p2_5)} | ${format(requests.p50)} | ${format(requests.p97_5)} | ${format(requests.average)} | ${format(requests.stddev)} | ${format(requests.min)} |
| Bytes/Sec | ${prettyBytes(throughput.p1)} | ${prettyBytes(throughput.p2_5)} | ${prettyBytes(throughput.p50)} | ${prettyBytes(throughput.p97_5)} | ${prettyBytes(throughput.average)} | ${prettyBytes(throughput.stddev)} | ${prettyBytes(throughput.min)} |
`
    return latencyTable + rateTable
}
const toHtmlTable = (data) => {
    const { latency, requests, throughput } = data
    const latencyTable = `
<table>
<thead>
    <tr>
        <th>Stat</th>
        <th>2.5%</th>
        <th>50%</th>
        <th>97.5%</th>
        <th>99%</th>
        <th>Avg</th>
        <th>Stdev</th>
        <th>Max</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td>Latency</td>
        <td>${toMs(latency.p2_5)} ms</td>
        <td>${toMs(latency.p50)} ms</td>
        <td>${toMs(latency.p97_5)} ms</td>
        <td>${toMs(latency.p99)} ms</td>
        <td>${toMs(latency.average)} ms</td>
        <td>${toMs(latency.stddev)} ms</td>
        <td>${toMs(latency.max)} ms</td>
    </tr>
</tbody>
</table>
`
    const rateTable = `
<table>
<thead>
    <tr>
        <th>Stat</th>
        <th>1%</th>
        <th>2.5%</th>
        <th>50%</th>
        <th>97.5%</th>
        <th>Avg</th>
        <th>Stdev</th>
        <th>Min</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td>Req/Sec</td>
        <td>${requests.p1.toLocaleString()}</td>
        <td>${requests.p2_5.toLocaleString()}</td>
        <td>${requests.p50.toLocaleString()}</td>
        <td>${requests.p97_5.toLocaleString()}</td>
        <td>${requests.average.toLocaleString()}</td>
        <td>${requests.stddev.toLocaleString()}</td>
        <td>${requests.min.toLocaleString()}</td>
    </tr>
    <tr>
        <td>Bytes/Sec</td>
        <td>${prettyBytes(throughput.p1)}</td>
        <td>${prettyBytes(throughput.p2_5)}</td>
        <td>${prettyBytes(throughput.p50)}</td>
        <td>${prettyBytes(throughput.p97_5)}</td>
        <td>${prettyBytes(throughput.average)}</td>
        <td>${prettyBytes(throughput.stddev)}</td>
        <td>${prettyBytes(throughput.min)}</td>
    </tr>
</tbody>
</table>
`
    return latencyTable + rateTable
}
const app = express()
let n = parseInt(process.env.MW || '1', 10)
console.log('  %s middleware', n)
while (n--) {
  app.use(function(req, res, next){
    next()
  })
}
app.use((req, res) => {
  res.send('Hello World')
})
app.on('listening', function () {
  const { port } = this.address()
  autocannon({
    url: `http://localhost:${port}/?foo[bar]=baz`,
    pipelining: 10, 
    connections: 100,
    duration: 5,
    title: 'Version 3',
    workers: 4
  }, (err, result) => {
    console.log(toTable(result))
    fs.appendFile(`benchmarks/README.md`, `## ${result.title} - ${new Date().toLocaleString()}
${toTable(result)}\n`, 'utf8', () => {
        server.close()
    })
  })
})
const server = app.listen()

