# Data Classification

LifeOS uses four data classes:

- `public`
- `private`
- `restricted`
- `derived`

## Rules

- Restricted raw data must stay local by default.
- Restricted raw data must not be sent to remote models.
- Restricted raw data must not be stored in Convex in plaintext.
- Derived outputs may leave the device only if produced under policy.

## Examples

| Class | Examples |
| --- | --- |
| `public` | task titles, tags, settings labels |
| `private` | note excerpts, routine summaries, contact notes |
| `restricted` | health exports, finance statements, camera frames |
| `derived` | summaries, classifications, metrics, embeddings |

