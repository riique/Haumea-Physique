# Haumea Physique

Centralize treino, alimentação, medidas, exames e evolução física em um painel pessoal, em vez de espalhar o acompanhamento entre planilhas, fotos e anotações.

Haumea Physique é uma aplicação web responsiva para registrar e consultar informações de rotina física. Cada conta mantém seus dados no Firebase e acessa módulos específicos para planejamento e histórico.

## O que a aplicação reúne

- **Treinos:** seções, exercícios, séries, repetições, descanso, notas e imagens.
- **Dieta:** refeições, alimentos, quantidades, macronutrientes e calorias.
- **Bioimpedância:** registros, métricas, comparação e anexos.
- **Evolução:** medidas, peso e fotos organizadas por poses e datas.
- **Exames:** marcadores laboratoriais, datas, observações e arquivos.
- **Protocolos:** itens, dosagens, frequência e via de administração.
- **Suplementos:** rotina diária e acompanhamento de itens concluídos.
- **Painel:** visão resumida dos dados cadastrados.
- **Exportação:** geração de PDFs para planos de treino e alimentação.

## Benefícios práticos

- Consulte o histórico em qualquer dispositivo autenticado.
- Compare registros ao longo do tempo sem perder o contexto visual.
- Ajuste quantidades da dieta com recálculo proporcional de macros e calorias.
- Anexe imagens e documentos ao registro correspondente.
- Separe os dados por usuário com Firebase Authentication e caminhos próprios no Firestore/Storage.

## Tecnologias

- Next.js 14 e React 18
- TypeScript e Tailwind CSS
- Firebase Authentication, Firestore e Storage
- `date-fns` para datas
- `html2canvas` e `jsPDF` para exportação

## Requisitos

- Node.js 20 ou superior
- npm
- Um projeto Firebase
- Authentication por e-mail/senha habilitado
- Firestore e Storage configurados com regras adequadas

## Instalação

```bash
git clone https://github.com/riique/Haumea-Physique.git
cd Haumea-Physique
npm install
```

Crie `.env.local` a partir do exemplo:

```powershell
Copy-Item .env.example .env.local
```

No Linux ou macOS:

```bash
cp .env.example .env.local
```

Preencha as variáveis públicas do aplicativo Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Esses identificadores conectam o cliente ao Firebase, mas não substituem regras seguras no Firestore e no Storage.

## Executar

Ambiente de desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:3000`.

Build e execução de produção:

```bash
npm run build
npm start
```

## Configuração do Firebase

Antes de usar com dados reais:

1. habilite o provedor **E-mail/senha** em Authentication;
2. crie Firestore e Storage;
3. escreva regras que permitam a cada usuário acessar somente `users/{uid}` e seus próprios arquivos;
4. configure limites, retenção e backups;
5. valide cadastro, login, upload e exclusão com uma conta de teste.

Este repositório não inclui regras do Firestore ou do Storage. Publicar o frontend sem configurá-las corretamente pode deixar dados pessoais inacessíveis ou expostos.

## Rotas

| Rota | Conteúdo |
| --- | --- |
| `/` | painel geral |
| `/treinos` | planos e exercícios |
| `/dieta` | refeições e metas nutricionais |
| `/bioimpedancia` | avaliações corporais |
| `/evolucao` | medidas e fotos |
| `/exames` | resultados laboratoriais |
| `/protocolos` | protocolos cadastrados |
| `/suplementos` | rotina de suplementação |
| `/configuracoes` | perfil e preferências |
| `/login` | acesso e criação de conta |

## Estrutura

```text
src/app/          páginas e rotas do Next.js
src/components/   navegação e componentes compartilhados
src/contexts/     sessão e dados do usuário
src/lib/          inicialização do Firebase
.env.example      variáveis necessárias
firebase.json     configuração de Hosting
```

## Aviso importante

> Haumea Physique é uma ferramenta de organização pessoal. Ela não diagnostica condições, não interpreta exames de forma clínica e não substitui médico, nutricionista, profissional de educação física ou outro profissional habilitado.

Protocolos, dosagens, dieta, suplementação e leitura de marcadores laboratoriais podem envolver riscos. Use o sistema apenas para registrar decisões orientadas por profissionais. Em caso de sintomas ou urgência, procure atendimento adequado.

Os dados cadastrados podem incluir informações de saúde e imagens pessoais. A pessoa que implantar a aplicação é responsável por autenticação, regras de acesso, consentimento, backups, exclusão e conformidade com a legislação aplicável.

## Estado atual e limitações

- A aplicação depende de um projeto Firebase configurado externamente.
- Não há migrações de banco nem ambiente de demonstração incluído.
- Os PDFs são gerados no navegador e podem variar conforme conteúdo e dispositivo.
- A precisão de macros, medidas e registros depende dos dados informados pelo usuário.

## Contribuição

Relate bugs com rota, navegador e passos para reproduzir, sem anexar dados de saúde reais. Pull requests devem preservar o isolamento entre usuários e evitar qualquer promessa médica não sustentada.

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
