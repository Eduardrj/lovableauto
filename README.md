# ⚡ LovableAuto

LovableAuto é uma poderosa integração que conecta o **Lovable.dev**, o seu repositório no **GitHub** e a inteligência artificial do **Google Gemini** para realizar edições autônomas diretamente no código do seu projeto.

## 🏗️ Arquitetura do Projeto

O projeto é dividido em duas partes principais:

1. **Extension (`/extension`)**: Uma extensão de navegador (Google Chrome) que roda em cima do Lovable.dev. Ela atua como a interface de comunicação do usuário, detecta o repositório atual e permite o envio de comandos para a IA via chat.
2. **Backend (`/backend`)**: Um servidor Node.js construído com **Fastify**. Ele é responsável por orquestrar a autenticação (OAuth do GitHub), gerenciar a fila de tarefas pesadas com **BullMQ / Redis**, comunicar-se com a API do **Gemini** (usando modelos avançados como o Gemini 2.5 Flash Lite) e aplicar as mudanças diretamente via commits no GitHub.

## ✨ Funcionalidades

- **Autenticação Segura via GitHub OAuth**: Tokens criptografados e salvos em banco de dados seguro.
- **Detecção Avançada (Shadow DOM)**: A extensão localiza automaticamente qual projeto do GitHub você está editando no Lovable.
- **Integração com Gemini**: Chat direto com a IA pedindo mudanças no sistema.
- **Edição Autônoma**: O backend planeja as alterações de código, clona o repositório, edita, faz o build e gera o commit sozinho.
- **Histórico e Rollback**: Permite reverter as últimas edições da IA se algo não sair como planejado.

---

## 🚀 Requisitos

Para rodar esse projeto você precisa de:
- **Node.js** (v18+)
- Banco de Dados **PostgreSQL** (ou um projeto no Supabase)
- **Redis** (Para gerenciar a fila de jobs do BullMQ)
- Chaves do **GitHub OAuth App** (Client ID e Secret)
- Chave de API do **Google Gemini**

---

## ⚙️ Instalação e Configuração

### 1. Configurando o Backend (Servidor / VPS)
Navegue até a pasta do backend e instale as dependências:
```bash
cd backend
npm install
```

Crie o arquivo de variáveis de ambiente:
```bash
cp .env.example .env
```
Abra o `.env` e preencha as variáveis como `DATABASE_URL`, `REDIS_URL`, `GITHUB_CLIENT_ID`, e sua `GOOGLE_API_KEY`. Você também pode configurar qual modelo LLM utilizar alterando a variável `LLM_MODEL`.

Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

### 2. Configurando a Extensão (Local / Chrome)
Navegue até a pasta da extensão e instale as dependências:
```bash
cd extension
npm install
```

Ajuste o arquivo `src/shared/api-client.ts` para apontar para o IP da sua VPS ou servidor local (se necessário).

Gere a build da extensão:
```bash
npm run build
```

**Para instalar no Chrome:**
1. Acesse `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" (Canto superior direito)
3. Clique em "Carregar sem compactação" (Load unpacked)
4. Selecione a pasta `/extension/dist`

---

## 🎮 Como Usar

1. Entre no [Lovable.dev](https://lovable.dev) e abra um projeto existente.
2. Abra a barra lateral do **LovableAuto** na interface.
3. Se for sua primeira vez, clique em **"Conectar com GitHub"** para fazer o login.
4. Caso o sistema não consiga ler automaticamente a qual repositório aquele projeto pertence, digite manualmente (ex: `usuario/repositorio`) e clique em **Conectar Manualmente**.
5. No chat, descreva o que você deseja alterar no código (Ex: _"Traduza as partes em inglês da tela principal para português"_).
6. Acompanhe a barra lateral planejar e executar as alterações de forma autônoma!

---

## 🛠️ Tecnologias Utilizadas
- **React + Vite** (Extensão)
- **Zustand** (Gerenciamento de Estado)
- **Fastify** (Backend Node.js rápido)
- **Prisma** (ORM para conexão com o banco de dados)
- **BullMQ + Redis** (Filas assíncronas)
- **Simple-Git** (Integração direta de commits no backend)
- **Google Generative AI SDK** (Integração com Gemini)
