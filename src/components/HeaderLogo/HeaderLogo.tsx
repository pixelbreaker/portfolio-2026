import logo from './logo.svg?raw'

export function HeaderLogo() {
  return <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo }} />
}
