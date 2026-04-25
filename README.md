# LovableAuto

LovableAuto é uma ferramenta poderosa projetada para automatizar e aprimorar o fluxo de trabalho no [Lovable.dev](https://lovable.dev), integrando inteligência artificial (Gemini/OpenAI) e automação via GitHub.

## 🚀 Funcionalidades

- **Integração com IA**: Conexão direta com modelos Gemini e OpenAI para assistência inteligente.
- **Gerenciamento de Projetos**: Sincronização e detecção automática de projetos do Lovable.
- **Extensão de Navegador**: Painel lateral intuitivo para interação em tempo real.
- **Sincronização com GitHub**: Integração via Octokit para gerenciar repositórios e autenticação.
- **Backend Robusto**: API escalável construída com Node.js, Express e Drizzle ORM.

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js & TypeScript**
- **Express**: Framework web.
- **Drizzle ORM**: Integração com banco de dados PostgreSQL.
- **Octokit**: SDK oficial do GitHub.
- **OpenAI/Gemini API**: Motores de IA.

### Extensão (Frontend)
- **React**: Interface de usuário.
- **Vite**: Bundler e servidor de desenvolvimento.
- **Tailwind CSS**: Estilização moderna.
- **Zustand**: Gerenciamento de estado leve.
- **Lucide React**: Ícones elegantes.

## 📦 Estrutura do Projeto

```bash
├── backend/       # API e lógica de servidor
├── extension/     # Código fonte da extensão do navegador
└── shared/        # Tipos e utilitários compartilhados
```

## ⚙️ Configuração

### Pré-requisitos
- Node.js (v18+)
- PostgreSQL
- Chaves de API (GitHub, OpenAI/Gemini)

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/Eduardrj/lovableauto.git
   cd lovableauto
   ```

2. Instale as dependências:
   ```bash
   # No diretório raiz (se houver workspace) ou individualmente:
   cd backend && npm install
   cd ../extension && npm install
   ```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` no `backend/` seguindo o exemplo de configuração necessário (DB URL, API Keys).

4. Inicie o desenvolvimento:
   - **Backend**: `npm run dev` (dentro de `backend/`)
   - **Extensão**: `npm run dev` (dentro de `extension/`)

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido para otimizar a criação de aplicações no Lovable.
