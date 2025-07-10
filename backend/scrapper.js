// scrapper.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function getJogosDoSantos() {
  let browser;
  const screenshotBaseDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotBaseDir)) {
    fs.mkdirSync(screenshotBaseDir);
  }

  try {
    console.log('--- Iniciando o processo de scraping ---');
    browser = await puppeteer.launch({
      headless: false, // Mude para true para produção, false para depuração visual
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--start-maximized'],
      defaultViewport: null
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    const URL_AGENDA = 'https://ge.globo.com/sp/santos-e-regiao/futebol/times/santos/agenda-de-jogos-do-santos/#/proximos-jogos';
    console.log(`Navegando para: ${URL_AGENDA}`);
    await page.goto(URL_AGENDA, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.screenshot({ path: path.join(screenshotBaseDir, 'ge_palmeiras_pagina_inicial.png'), fullPage: true });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: path.join(screenshotBaseDir, 'ge_palmeiras_pagina_apos_scroll.png'), fullPage: true });

    let globalBroadcastChannels = [];
    let modalScreenshotFileName = null;

    console.log("Tentando encontrar e clicar no botão 'Onde assistir?'...");
    try {
        const ondeAssistirButtonSelector = '.sc-kOPcWz.bwHKOS'; 
        
        const primeiroOndeAssistirBtn = await page.waitForSelector(ondeAssistirButtonSelector, { visible: true, timeout: 10000 });

        if (primeiroOndeAssistirBtn) {
            console.log("Botão 'Onde assistir?' encontrado. Clicando...");
            await primeiroOndeAssistirBtn.click();
            // AQUI: Espera um pouco mais para o modal renderizar completamente.
            await new Promise(resolve => setTimeout(resolve, 4000)); // Aumentado para 4 segundos

            // --- NOVO TRECHO PARA SCREENSHOT APENAS DO MODAL ---
            // Tente identificar o seletor do conteúdo principal do modal, não apenas o backdrop ou o container geral.
            // Inspecione o modal na página e procure pela div que contém o título "Onde assistir?" e a lista de canais.
            const modalContentSelector = 'div[aria-modal="true"], .c-modal-body, .childrenstyle_DrawerBody__sc-1k9dcfm-1'; // Adicionei 'div[aria-modal="true"]'
            const modalElement = await page.waitForSelector(modalContentSelector, { visible: true, timeout: 5000 });

            if (modalElement) {
                modalScreenshotFileName = 'modal_onde_assistir_somente.png';
                await modalElement.screenshot({ path: path.join(screenshotBaseDir, modalScreenshotFileName) });
                console.log(`Screenshot APENAS do modal salva como: ${modalScreenshotFileName}`);
            } else {
                console.warn("Elemento do conteúdo do modal não encontrado para tirar screenshot específica. Salvando screenshot da página completa como fallback.");
                modalScreenshotFileName = 'modal_onde_assistir_aberto_FULLPAGE_FALLBACK.png';
                await page.screenshot({ path: path.join(screenshotBaseDir, modalScreenshotFileName), fullPage: true });
            }
            // --- FIM DO TRECHO DE SCREENSHOT APENAS DO MODAL ---

            // Extração dos canais do modal
            const modalChannelsElements = await page.$$('.sc-ewnqHT.gHsKNV');
            if (modalChannelsElements.length > 0) {
                for (const el of modalChannelsElements) {
                    const text = await page.evaluate(node => node.textContent.trim(), el);
                    if (text) {
                        const cleanedText = text.split('.')[0].replace(/Transmissão\s*/, '').trim();
                        if (cleanedText) {
                            globalBroadcastChannels.push(cleanedText);
                        }
                    }
                }
            }
            console.log('Canais extraídos do modal:', globalBroadcastChannels.join(', ') || 'Nenhum canal encontrado no modal.');

            // Fechar o modal
            try {
                const fecharModalBtn = await page.waitForSelector('button[aria-label="Fechar"], .c-modal-close-button, .icon-close', { timeout: 5000 }); 
                if (fecharModalBtn) {
                    await fecharModalBtn.click();
                    console.log("Modal 'Onde assistir?' fechado.");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.warn("Botão para fechar modal não encontrado. Tentando 'Escape'.");
                    await page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } catch (closeModalError) {
                console.warn("Erro ao tentar fechar o modal, tentando 'Escape':", closeModalError.message);
                await page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } else {
            console.log("Botão 'Onde assistir?' não encontrado na página.");
        }
    } catch (clickError) {
        console.error("Erro ao tentar clicar no botão 'Onde assistir?' ou extrair do modal:", clickError.error || clickError.message);
    }

    const jogos = [];

    // IMPORTANTE: Este seletor AINDA PRECISA SER CORRIGIDO por você,
    // inspecionando o elemento que encapsula CADA JOGO na lista principal da agenda.
    const gameElements = await page.$$('.agenda-ficha'); // <<< TROQUE ESTE SELETOR!

    if (gameElements.length === 0) {
      console.warn('Nenhum elemento de jogo encontrado com o seletor .agenda-ficha. VERIFIQUE ESTE SELETOR NO HTML DA PÁGINA!');
    }

    let gameId = 0;

    for (const el of gameElements) {
      const match = {};

      const dateElement = await el.$('.data');
      match.date = dateElement ? await page.evaluate(el => el.textContent.trim(), dateElement) : 'Data não informada';

      const competitionElement = await el.$('.tag');
      match.competition = competitionElement ? await page.evaluate(el => el.textContent.trim(), competitionElement) : 'Competição não informada';

      const teamNames = await el.$$eval('.nome-completo', nodes => nodes.map(n => n.textContent.trim()));
      match.homeTeam = teamNames[0] || 'Time da Casa não informado';
      match.awayTeam = teamNames[1] || 'Time Visitante não informado';

      const timeElement = await el.$('.horario');
      match.time = timeElement ? await page.evaluate(el => el.textContent.trim(), timeElement) : 'Horário não informado';

      const stadiumElement = await el.$('.local-jogo');
      match.stadium = stadiumElement ? await page.evaluate(el => el.textContent.trim(), stadiumElement) : 'Estádio não informado';

      match.broadcastChannels = globalBroadcastChannels.length > 0 ? globalBroadcastChannels : ['Não informado'];

      match.id = `game-${gameId++}`;

      jogos.push(match);
      console.log('Jogo extraído:', match);
    }

    console.log(`Total de jogos extraídos: ${jogos.length}`);
    
    return { games: jogos, modalScreenshot: modalScreenshotFileName };

  } catch (error) {
    console.error(`!!! ERRO FATAL NO SCRAPING: ${error.message}`);
    if (browser) {
      await page.screenshot({ path: path.join(screenshotBaseDir, 'ge_palmeiras_erro_fatal.png'), fullPage: true });
    }
    throw new Error('Falha catastrófica ao raspar os jogos: ' + error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Navegador fechado.');
    }
    console.log('--- Processo de scraping finalizado ---');
  }
}

module.exports = getJogosDoSantos;