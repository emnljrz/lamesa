# LaMesa

> Headless, framework-agnostic table engine. You own the UI. LaMesa owns the logic.

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