# Inter Bank PIX Configuration Guide

To properly set up the PIX integration with Inter Bank, follow these steps to obtain and configure your environment keys.

## 1. Get API Credentials
1. Access the [Inter Conta Digital](https://conta.bancointer.com.br/) portal.
2. Navigate to **Gestão de APIs** -> **Aplicações** -> **Nova Aplicação**.
3. Select the **PIX** scope.
4. Download the **Client ID** and **Client Secret**.
5. Generate and download the **Certificate (.crt)** and **Private Key (.key)** files.

## 2. Project Configuration
Place the certificate files in the backend project structure (e.g., `src/infrastructure/pix/certs/`):
- `certs/inter.crt`
- `certs/inter.key`

> [!WARNING]
> Never commit these certificate files to your version control system. Add them to `.gitignore`.

## 3. Environment Variables
Add the following keys to your `.env` file in the backend:

```env
INTER_CLIENT_ID=your_client_id
INTER_CLIENT_SECRET=your_client_secret
INTER_PIX_KEY=your_pix_key_registered_at_inter
INTER_CERT_PATH=./src/infrastructure/pix/certs/inter.crt
INTER_KEY_PATH=./src/infrastructure/pix/certs/inter.key
```

## 4. PIX Payload Details
- **Plan Cost**: 30.00 BRL
- **Currency**: BRL
- **Payment Method**: PIX (Immediate Charge / Cobrança Imediata)
