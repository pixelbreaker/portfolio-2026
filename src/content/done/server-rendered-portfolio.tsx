// A component content page: metadata travels as named exports, the layout as
// the default export. The page shell renders title and summary; this
// component owns everything below them and can use any React feature.
export const title = 'Choosing server rendering for the portfolio'
export const summary =
  'Why this portfolio uses TanStack Start and the Netlify server adapter instead of a static SPA rewrite.'

const tradeoffs = [
  {
    keep: 'Server-rendered document requests',
    give: 'None; the adapter keeps them',
  },
  {
    keep: 'Server routes and functions later',
    give: 'None; the adapter keeps them',
  },
  {
    keep: 'Simpler deploy artifact',
    give: 'A static SPA would publish plain files',
  },
]

export default function ServerRenderedPortfolio() {
  return (
    <div className="prose">
      <p>
        The portfolio serves document requests through TanStack Start. Netlify
        publishes the client assets while routing runtime requests through its
        server function.
      </p>
      <h2>The tradeoff</h2>
      <table>
        <thead>
          <tr>
            <th>We keep</th>
            <th>We give up</th>
          </tr>
        </thead>
        <tbody>
          {tradeoffs.map((row) => (
            <tr key={row.keep}>
              <td>{row.keep}</td>
              <td>{row.give}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        A static single-page app rewrite would be simpler, but it would give up
        server-rendered document requests and the option to add server routes
        later. The server adapter preserves both, so the portfolio keeps them.
        This very section is a React component: it renders an interactive
        decision table instead of static prose, which markdown alone could not
        do.
      </p>
    </div>
  )
}
