# Benchmark history


# 2024-01-06

Redesigned Express to not create a prototype chain on the req/res objects. The following are the benchmark results between the old version (Express 5 - with prototype chaining) with the new design.

**System Specs**

- Mac mini
- Apple M1
- Memory: 16 GB
- OS Version: 14.2.1 macOS Sonoma

## Old design (with prototype chain)

    autocannon -c 100 -d 5 -p 10 http://localhost:3333/?foo[bar]=baz

    Running 5s test @ http://localhost:3333/?foo[bar]=baz
    100 connections with 10 pipelining factor


    ┌─────────┬───────┬───────┬───────┬───────┬──────────┬──────────┬─────────┐
    │ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev    │ Max     │
    ├─────────┼───────┼───────┼───────┼───────┼──────────┼──────────┼─────────┤
    │ Latency │ 16 ms │ 29 ms │ 66 ms │ 70 ms │ 38.63 ms │ 61.67 ms │ 1562 ms │
    └─────────┴───────┴───────┴───────┴───────┴──────────┴──────────┴─────────┘
    ┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
    │ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
    ├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
    │ Req/Sec   │ 22,351  │ 22,351  │ 26,143  │ 26,543  │ 25,460.8 │ 1,568.25 │ 22,336  │
    ├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
    │ Bytes/Sec │ 5.32 MB │ 5.32 MB │ 6.22 MB │ 6.32 MB │ 6.06 MB  │ 375 kB   │ 5.32 MB │
    └───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

    Req/Bytes counts sampled once per second.
    # of samples: 5

    128k requests in 5.02s, 30.3 MB read

## New design

    autocannon -c 100 -d 5 -p 10 http://localhost:3333/?foo[bar]=baz

    Running 5s test @ http://localhost:3333/?foo[bar]=baz
    100 connections with 10 pipelining factor


    ┌─────────┬──────┬───────┬───────┬───────┬──────────┬──────────┬────────┐
    │ Stat    │ 2.5% │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev    │ Max    │
    ├─────────┼──────┼───────┼───────┼───────┼──────────┼──────────┼────────┤
    │ Latency │ 9 ms │ 16 ms │ 22 ms │ 26 ms │ 16.32 ms │ 11.46 ms │ 471 ms │
    └─────────┴──────┴───────┴───────┴───────┴──────────┴──────────┴────────┘
    ┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬──────────┬─────────┐
    │ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev    │ Min     │
    ├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
    │ Req/Sec   │ 54,943  │ 54,943  │ 60,575  │ 60,703  │ 59,363.2 │ 2,230.44 │ 54,922  │
    ├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼──────────┼─────────┤
    │ Bytes/Sec │ 13.1 MB │ 13.1 MB │ 14.4 MB │ 14.4 MB │ 14.1 MB  │ 531 kB   │ 13.1 MB │
    └───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴──────────┴─────────┘

    Req/Bytes counts sampled once per second.
    # of samples: 5

    298k requests in 5.02s, 70.6 MB read

# Results

## Version 3 - 1/6/2024, 6:51:42 PM

| Stat | 2.5% | 50% | 97.5% | 99% | Avg | Stdev | Max |
|:-----|:----:|:---:|:-----:|:---:|:---:|:-----:|:---:|
| Latency | 7 ms | 18 ms | 21 ms | 26 ms | 15.23 ms | 17.1 ms | 600 ms |

| Stat | 1% | 2.5% | 50% | 97.5% | Avg | Stdev | Min |
|:-----|:--:|:----:|:---:|:-----:|:---:|:-----:|:---:|
| Req/Sec | 56,255 | 56,255 | 64,511 | 66,495 | 63,388.8 | 3,687.84 | 56,241 |
| Bytes/Sec | 13.4 MB | 13.4 MB | 15.4 MB | 15.8 MB | 15.1 MB | 877 kB | 13.4 MB |

