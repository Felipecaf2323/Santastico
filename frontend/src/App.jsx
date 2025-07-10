// App.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios';
import { FaSyncAlt } from 'react-icons/fa';

const App = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modalScreenshotUrl, setModalScreenshotUrl] = useState(null); // Novo estado para a URL da screenshot

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const fetchData = useCallback(async (isUpdate = false) => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (isUpdate) {
        console.log("Chamando /api/atualizar-jogos...");
        response = await axios.get(`${API_BASE_URL}/atualizar-jogos`);
      } else {
        console.log("Chamando /api/jogos...");
        response = await axios.get(`${API_BASE_URL}/jogos`);
      }
      
      setMatches(response.data.games); // Pega os jogos de response.data.games
      setLastUpdated(new Date().toLocaleString());

      // Define a URL da screenshot, adicionando um timestamp para evitar cache
if (response.data.config && response.data.config.modalScreenshotUrl) {
  // Remova ${API_BASE_URL} e use diretamente a base do servidor Express
  setModalScreenshotUrl(`http://localhost:3001${response.data.config.modalScreenshotUrl}?t=${Date.now()}`);
} else {
  setModalScreenshotUrl(null);
}

    } catch (err) {
      console.error("Erro ao buscar/atualizar jogos:", err);
      setError("Não foi possível carregar/atualizar os jogos. Verifique o servidor ou tente novamente.");
      setModalScreenshotUrl(null); // Limpa a screenshot em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false); // Busca inicial
  }, [fetchData]);

  const updateMatches = () => {
    fetchData(true); // Força atualização (chama /atualizar-jogos)
  };

  return (
    <div>
      <header>
        <h1>Agenda de Jogos do Santos</h1> {/* Atualize o título */}
        <p>Onde assistir aos próximos jogos do Peixe!</p>
        {lastUpdated && <p className="last-updated">Última atualização: {lastUpdated}</p>}
        <button onClick={updateMatches} disabled={loading} className="update-button">
          <span className="refresh-icon" aria-hidden="true">
            <FaSyncAlt />
          </span>
          {loading ? "Atualizando..." : "Atualizar Jogos"}
        </button>
      </header>

      <main>
        {modalScreenshotUrl && (
          <div className="modal-screenshot-container">
            <h3>Canais de Transmissão (Última Verificação)</h3>
            <img 
              src={modalScreenshotUrl} 
              alt="Captura de tela do modal Onde Assistir" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', 
                borderRadius: '8px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                marginTop: '20px' // Adiciona um pouco de margem
              }} 
            />
            <p style={{fontSize: '0.8rem', color: '#ccc', marginTop: '10px'}}>
              Esta imagem reflete o modal "Onde Assistir?" do primeiro jogo encontrado na última atualização.
            </p>
          </div>
        )}

        {/* ... (restante da sua lógica de renderização de jogos, loading, error, empty) ... */}
        {loading && matches.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>A carregar jogos...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <p>Verifique a sua ligação ou tente recarregar a página ou atualizar os jogos.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-container">
            <p>Nenhum jogo encontrado para os próximos dias.</p>
            <p>Verifique novamente mais tarde ou clique em "Atualizar Jogos".</p>
          </div>
        ) : (
          <div className="cards-grid">
            {matches.map((match, index) => (
              <div key={match.id || index} className="card">
                <div className="card-header">
                  <h2>
                    {match.homeTeam} {match.homeTeam && match.awayTeam ? 'vs' : ''} {match.awayTeam}
                  </h2>
                  <span className="date">{match.date}</span>
                </div>
                <p>
                  <strong>Competição:</strong> {match.competition || 'Não informado'}
                </p>
                <p>
                  <strong>Horário:</strong> {match.time || 'Não informado'}
                </p>
                <p>
                  <strong>Estádio:</strong> {match.stadium || 'Não informado'}
                </p>
                <div className="channels">
                  <p className="channels-title">Canais de Transmissão:</p>
                  {match.broadcastChannels && match.broadcastChannels.length > 0 ? (
                    match.broadcastChannels.map((channel, i) => (
                      <span key={i} className="channel-badge">
                        {channel}
                      </span>
                    ))
                  ) : (
                    <span className="channel-badge">Não informado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer>
        <p>&copy; {new Date().getFullYear()} Santos Broadcast Info. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;