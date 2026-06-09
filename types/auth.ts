export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  must_change_password: boolean
}
