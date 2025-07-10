// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const getJogosDoSantos = require('./scrapper');

const app = express();
const PORT = 3001;

// SERVE ARQUIVOS ESTÁTICOS DA PASTA 'screenshots'
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

app.use(cors());

const jogosFilePath = path.join(__dirname, 'jogos.json');
const configFilePath = path.join(__dirname, 'config.json'); // Para salvar a URL da screenshot

app.get('/api/atualizar-jogos', async (req, res) => {
  try {
    console.log('Requisição para atualizar jogos recebida.');
    const { games, modalScreenshot } = await getJogosDoSantos(); // Pega games e modalScreenshot
    fs.writeFileSync(jogosFilePath, JSON.stringify(games, null, 2));
    
    // Salva a URL da screenshot em um arquivo de configuração separado
    const config = { modalScreenshotUrl: modalScreenshot ? `/screenshots/${modalScreenshot}` : null };
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));

    console.log('Jogos e configurações (incluindo screenshot) atualizados e salvos com sucesso.');
    res.json({ games, config }); // Retorna ambos
  } catch (error) {
    console.error('Erro ao atualizar os jogos:', error);
    res.status(500).json({ error: 'Falha ao raspar os jogos.' });
  }
});

app.get('/api/jogos', (req, res) => {
  try {
    console.log('Requisição para buscar jogos salvos recebida.');
    let games = [];
    let config = { modalScreenshotUrl: null };

    // Tenta ler jogos.json
    if (fs.existsSync(jogosFilePath)) {
      const dados = fs.readFileSync(jogosFilePath, 'utf-8');
      games = JSON.parse(dados);
    } else {
      console.warn('Arquivo jogos.json não encontrado.');
    }

    // Tenta ler config.json
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf-8');
      config = JSON.parse(configData);
    } else {
      console.warn('Arquivo config.json não encontrado.');
    }
    
    res.json({ games, config }); // Retorna ambos
  } catch (error) {
    console.error('Erro ao carregar os jogos salvos:', error);
    res.status(500).json({ error: 'Erro ao carregar os jogos salvos.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});