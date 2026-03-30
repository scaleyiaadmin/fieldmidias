# Field Mídias — Sistema de Aprovação de Conteúdos

Dashboard interno da **Field Control** para revisão e aprovação de posts de redes sociais gerados automaticamente pelo n8n.

---

## Como funciona

```
n8n gera conteúdo
       ↓
POST /api/webhook/content   ← n8n envia para cá
       ↓
Email de notificação → Líder acessa o dashboard
       ↓
Líder aprova ou rejeita
       ↓
POST callback_url           → n8n retoma e publica (se aprovado)
```

---

## Setup (passo a passo)

### 1. Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. No menu lateral, vá em **SQL Editor**
3. Cole e execute o conteúdo do arquivo `supabase-setup.sql`
4. Vá em **Project Settings → API** e copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`

### 2. Resend (emails)

1. Acesse [resend.com](https://resend.com) e crie uma conta gratuita
2. Vá em **API Keys → Create API Key** e copie → `RESEND_API_KEY`
3. Vá em **Domains** e adicione o domínio da empresa (ex: `fieldcontrol.com.br`)
   - Se ainda não tiver domínio verificado, use `onboarding@resend.dev` temporariamente
4. Defina o email de envio → `FROM_EMAIL`

### 3. Variáveis de ambiente (Vercel)

Crie um arquivo `.env` na raiz (copie do `.env.example`):

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
RESEND_API_KEY=re_...
NOTIFICATION_EMAIL=lider@fieldcontrol.com.br
FROM_EMAIL=midias@fieldcontrol.com.br
DASHBOARD_URL=https://field-midias.vercel.app
```

### 4. Deploy na Vercel

```bash
# Instalar Vercel CLI (se não tiver)
npm i -g vercel

# Fazer login
vercel login

# Deploy (primeira vez)
vercel

# Ao receber os prompts:
# - Link to existing project? N
# - Project name: field-midias
# - Directory: ./
# - Override settings? N

# Configurar variáveis de ambiente na Vercel:
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add RESEND_API_KEY
vercel env add NOTIFICATION_EMAIL
vercel env add FROM_EMAIL
vercel env add DASHBOARD_URL

# Deploy em produção
vercel --prod
```

### 5. Testar localmente (opcional)

```bash
# Rodar servidor de desenvolvimento
npx vercel dev
```

---

## Configuração no n8n

### Estrutura do workflow

```
[Trigger / IA] → [HTTP Request → Campo Mídias] → [Wait Node] → [IF aprovado?] → [Publicar no Instagram]
```

### Nó: HTTP Request (enviar para aprovação)

| Campo | Valor |
|---|---|
| Method | `POST` |
| URL | `https://field-midias.vercel.app/api/webhook/content` |
| Body Type | JSON |

**Body:**
```json
{
  "title": "{{ $json.title }}",
  "content": "{{ $json.caption }}",
  "platform": "instagram",
  "media_urls": ["{{ $json.image_url }}"],
  "scheduled_date": "{{ $json.scheduled_date }}",
  "callback_url": "{{ $execution.resumeUrl }}",
  "metadata": {
    "campaign": "{{ $json.campaign }}",
    "created_by": "Automação IA"
  }
}
```

### Nó: Wait (aguardar decisão)

- **Resume On:** `Webhook Call`
- **Limit Wait Time:** ✅ ativado → `72 horas` (timeout automático)

### Nó: IF (verificar decisão)

- **Condition:** `{{ $json.decision }}` `equals` `approved`
- **True path:** Publicar no Instagram
- **False path:** Encerrar / notificar equipe

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/webhook/content` | Recebe conteúdo do n8n |
| `GET` | `/api/contents` | Lista conteúdos (`?status=pending&platform=instagram`) |
| `POST` | `/api/contents/:id/decide` | Aprova ou rejeita um conteúdo |
| `GET` | `/api/stats` | Estatísticas do dashboard |

---

## Estrutura do projeto

```
field-midias/
├── api/
│   ├── webhook/
│   │   └── content.js       # Recebe do n8n
│   ├── contents/
│   │   ├── index.js         # Lista conteúdos
│   │   └── [id]/
│   │       └── decide.js    # Aprovação/rejeição
│   └── stats.js             # Estatísticas
├── lib/
│   ├── supabase.js          # Cliente Supabase
│   └── email.js             # Notificações Resend
├── public/
│   ├── index.html           # Dashboard
│   ├── css/style.css        # Estilos
│   └── js/app.js            # Lógica do frontend
├── supabase-setup.sql       # SQL para criar tabelas
├── vercel.json              # Configuração Vercel
├── package.json
└── .env.example             # Modelo de variáveis
```
