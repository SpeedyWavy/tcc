const traducoesErro = [
  [/user already registered|already registered with this email|email address .*already registered/i, 'Já existe uma conta cadastrada com este e-mail.'],
  [/user created successfully|user created/i, 'Usuário cadastrado com sucesso.'],
  [/user updated successfully|user updated/i, 'Usuário atualizado com sucesso.'],
  [/user deleted successfully|user deleted/i, 'Usuário excluído com sucesso.'],
  [/password should be at least \d+ characters?/i, 'A senha não atende ao tamanho mínimo exigido pelo sistema.'],
  [/password should be less than \d+ characters?/i, 'A senha ultrapassa o tamanho maximo permitido.'],
  [/unable to validate email address|invalid email address|email address is invalid|invalid email/i, 'O e-mail informado e inválido.'],
  [/email not confirmed/i, 'O e-mail ainda não foi confirmado.'],
  [/invalid login credentials|invalid login credential/i, 'Nome ou senha incorretos.'],
  [/user not found|no user found/i, 'Usuário não encontrado.'],
  [/database error saving (new )?user/i, 'Não foi possivel salvar o cadastro do usuário. Verifique os dados e tente novamente.'],
  [/duplicate key value violates unique constraint|duplicate key/i, 'Já existe um cadastro com esses dados. Verifique o e-mail e os identificadores informados.'],
  [/new row violates row-level security policy|row-level security policy/i, 'Sua conta não tem permissão para realizar esta operação.'],
  [/permission denied/i, 'Sua conta não tem permissão para realizar esta operação.'],
  [/invalid input syntax for type uuid|invalid uuid/i, 'O identificador informado e inválido. Atualize a página e tente novamente.'],
  [/violates foreign key constraint/i, 'Não foi possivel concluir porque este cadastro ainda est a outros dados.'],
  [/jwt expired|invalid jwt|unauthorized/i, 'Sua sessão expirou. Entre novamente para continuar.'],
  [/failed to send a request to the edge function|failed to fetch|fetch failed|networkerror|network request failed/i, 'Não foi possivel conectar ao servidor. Verifique sua conexão e tente novamente.'],
  [/edge function returned a non-2xx status code/i, 'O servidor não conseguiu concluir a operação. Tente novamente.'],
  [/internal server error|\bserver error\b/i, 'Ocorreu um erro no servidor. Tente novamente em instantes.'],
]

const termosEmIngles = /\b(the|please|failed|unable|could not|cannot|invalid|already|not found|required|unexpected|internal|unauthorized|forbidden|denied|fetch|network|error|status code|must be|does not exist)\b/i

export function traduzirMensagemUsuario(mensagem, fallback = 'Não foi possivel concluir a operação. Tente novamente.') {
  if (typeof mensagem !== 'string' || !mensagem.trim()) return fallback

  const texto = mensagem.trim()
  const traducao = traducoesErro.find(([expressao]) => expressao.test(texto))
  if (traducao) return traducao[1]

  return termosEmIngles.test(texto) ? fallback : texto
}
