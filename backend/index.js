const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors()); // permite acesso do frontend

const PORT = 3001;

const URL = 'https://ge.globo.com/sp/santos-e-regiao/futebol/times/santos/agenda-de-jogos-do-santos/#/proximos-jogos';

app.get('/api/jogos-santos', async (req, res) => {
  try {
    const { data: html } = await axios.get(URL);
    const $ = cheerio.load(html);

    const jogos = [];

    $('.feed-post').each((i, el) => {
      const text = $(el).text();

      // Aqui você deve adaptar para a estrutura real do conteúdo
      const date = $(el).find('.some-date-class').text().trim();
      const time = $(el).find('.some-time-class').text().trim();
      const competition = $(el).find('.some-competition-class').text().trim();
      const teams = $(el).find('.some-matchup-class').text().trim();
      const broadcast = $(el).find('.some-broadcast-class').text().trim();

      // Filtro: só jogos do Santos
      if (teams.includes('Santos')) {
        jogos.push({
          id: i.toString(),
          date,
          time,
          homeTeam: teams.split(' x ')[0].trim(),
          awayTeam: teams.split(' x ')[1].trim(),
          broadcastChannels: broadcast.split(',').map(c => c.trim()),
          competition,
          stadium: 'Indefinido' // ou extraído se disponível
        });
      }
    });

    res.json(jogos);
  } catch (error) {
    console.error('Erro no scraping:', error);
    res.status(500).json({ error: 'Erro ao buscar dados dos jogos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
