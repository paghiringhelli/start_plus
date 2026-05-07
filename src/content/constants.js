export const OVERLAY_ID = 'start-plus-overlay'
export const CENTER_MENU_ID = 'start-plus-center-menu'
export const ROW_TITLE_SELECTOR = '.table.container-table #colFixed .rowTitle'
export const ROW_TITLE_STYLE_ID = 'start-plus-row-title-style'
export const TARGET_HOST = 'startweb.118-vaud.ch'
export const TARGET_HASH_PATH = '/planning/statistiques'
export const ALLOWED_CENTER_IDS = new Set(['528', '529', '530', '531'])
export const REQUIRED_ITEM_ID = 'activitePersonnel'
export const CENTER_LINKS = [
  { label: 'Jongny', centerId: '531' },
  { label: 'Montreux', centerId: '528' },
  { label: 'St-Légier', centerId: '530' },
  { label: 'Vevey', centerId: '529' },
]

export const YEARLY_TARGET_HOURS = Number(
  import.meta.env.YEARLY_TARGET_HOURS ?? import.meta.env.VITE_YEARLY_TARGET_HOURS,
) || 1716

export const AUTHZ_POLICY_FILE = 'authz-policy.json'
export const AUTHZ_PUBLIC_KEY = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQCjT9dgz9hO/rlc9C+RaX8SBpt1q0gNu2NeZ3rFFSKXQJOgadzZ3E40gLkDOehePpKv+j3M4rJvydJT6Fb2CqEjSYJ78jyfZdUSBURwzmSTuUh6JwwH4bWZy4213dA9jbOjuQ4IIfryC26nQMPyYYZ0QeXHHSNjKSnefa4Ke0bLZlJZAn2NHRt0Ma/6u7dDJKx/nsih8Lc1oEzq8tq9rxgFfwALdKhS8TxLV385ZnM1uwz0tIvF/2ZfuzmNU+GhlYatorafWFVJMw6irGcaa6avKCV3IwKbsrSbfSSaWRGp5BqqXt0P2DG7Agjer+5A5wMHMN6D9GAe7+DYiIOk+tY+lYfq/uvmSpbDZ3ee5pztmmoIgCsTqEXZUQNun5J8Eh/HOkTAxqO+w/4JRZkEHWw7tAytawS9rrkvsi4HwK/pMw+IO3H7uVBoOJguJACrW+espJjyO46qFvbfV4K5q0EXugYYqoIjcCBTCfVwj7TRf2kRvEBRXj0zEyKtTF20g6s/zWwlSRs9mp5RJ/2u6w+x2vJvAknURlRrvbCTml/6PRr77PnmavmRMq+GjJugj3uus29r3ffDARtJ8Uwbc38k9SYzEhS6UHmFmd3HVwWTfpRtmkahTsemNrWc15gYGcMZ/k+EXzwyDji6cZMQjqwJVgccqLz4JNIKrvpm77eGtQ=='

export const OVERLAY_STYLE = `
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: rgba(5, 13, 31, 0.62);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 16px;
`

export const PANEL_STYLE = `
  width: min(960px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow: auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.35);
  padding: 16px 18px 20px;
  font: 14px/1.4 'Segoe UI', sans-serif;
  color: #0f172a;
`
