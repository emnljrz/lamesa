# 🍽️ LaMesa Monorepo

`@lamesa/core` • `@lamesa/csv-parser` • `@lamesa/angular`

[![CI](https://github.com/emnljrz/lamesa/actions/workflows/ci.yml/badge.svg)](https://github.com/emnljrz/lamesa/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/emnljrz/lamesa/graph/badge.svg?token=YOUR_CODECOV_GRAPH_TOKEN)](https://codecov.io/gh/emnljrz/lamesa)

---

LaMesa is a high-performance, headless table engine designed to power complex data grids across multiple frameworks.
## Packages

| Package | Version | Description |
|---|---|---|
| [`@lamesa/core`](./packages/core) | 0.1.0 | Core table engine |
| [`@lamesa/csv-parser`](./packages/csv-parser) | 0.1.0 | CSV → JSON ingestion |

## Roadmap

- [ ] `@lamesa/react` — React adapter
- [ ] `@lamesa/angular` — Angular adapter  
- [ ] `@lamesa/vue` — Vue adapter

## Getting Started

```js
import { TableCore } from '@lamesa/core'
import { parseCsv } from '@lamesa/csv-parser'

const data = parseCsv(csvString)

const table = new TableCore({
  columns: [
    { id: 'name', header: 'Name', accessorKey: 'name' },
    { id: 'age',  header: 'Age',  accessorKey: 'age'  },
  ],
  data,
})

table.subscribe(() => render(table))
```

## License

MIT