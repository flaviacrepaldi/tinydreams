import {complete} from './planner.js';
// This catalog stays on the server. Locked entries never include their identity.
const WRITERS=[
 ['Machado de Assis','Brasil','1839–1908','Romancista, contista e cronista carioca, observou as contradições humanas com ironia e delicadeza. Foi um dos fundadores e o primeiro presidente da Academia Brasileira de Letras.',['Dom Casmurro','Memórias Póstumas de Brás Cubas','Quincas Borba'],'https://www2.academia.org.br/academicos/machado-de-assis/biografia'],
 ['Jane Austen','Reino Unido','1775–1817','Com humor e uma atenção extraordinária às relações humanas, a escritora inglesa transformou o cotidiano, o casamento e as convenções sociais em romances que atravessam gerações.',['Orgulho e Preconceito','Razão e Sensibilidade','Emma'],'https://janeaustens.house/jane-austen/'],
 ['Toni Morrison','Estados Unidos','1931–2019','Romancista e editora, deu voz à memória e à experiência negra nos Estados Unidos. Sua escrita reúne história, identidade e imaginação. Recebeu o Nobel de Literatura em 1993.',['Amada','O olho mais azul','Canção de Salomão'],'https://www.pulitzer.org/news/memoriam-toni-morrison-1931-2019'],
 ['Yasunari Kawabata','Japão','1899–1972','Sua prosa delicada encontra beleza nos gestos, no silêncio e na passagem do tempo. Foi o primeiro escritor japonês a receber o Nobel de Literatura, em 1968.',['O país das neves','A dançarina de Izu','O som da montanha'],'https://www.nobelprize.org/prizes/literature/1968/kawabata/biographical/'],
 ['Rabindranath Tagore','Índia','1861–1941','Poeta, músico e educador bengali, aproximou natureza, espiritualidade e vida cotidiana. Em 1913, recebeu o Nobel de Literatura, tornando sua poesia conhecida muito além da Índia.',['Gitanjali (Oferenda lírica)','O jardineiro'],'https://www.nobelprize.org/prizes/literature/1913/tagore/biographical/'],
 ['Chinua Achebe','Nigéria','1930–2013','Romancista e ensaísta nigeriano, abriu caminhos para a literatura africana moderna. Seus livros colocam histórias e perspectivas africanas no centro da narrativa sobre o encontro com o colonialismo.',['Things Fall Apart','Arrow of God','No Longer at Ease'],'https://manchesteruniversitypress.co.uk/9780719084362/'],
 ['Gabriela Mistral','Chile','1889–1957','Poeta e educadora chilena, escreveu sobre infância, afeto e perda. Sua voz uniu sensibilidade e compromisso com a educação. Recebeu o Nobel de Literatura em 1945.',['Desolación','Ternura','Tala'],'https://www.loc.gov/item/n50033817/gabriela-mistral-chile-1889-1957/'],
 ['Albert Camus','França · nascido na Argélia','1913–1960','Romancista, dramaturgo e ensaísta, investigou a liberdade, a revolta e a procura de sentido. Sua obra combina perguntas filosóficas com histórias profundamente humanas. Recebeu o Nobel de Literatura em 1957.',['O estrangeiro','A peste','O mito de Sísifo'],'https://plato.stanford.edu/entries/camus/'],
 ['Selma Lagerlöf','Suécia','1858–1940','A escritora sueca entrelaçou lendas, paisagens e imaginação em suas histórias. Foi a primeira mulher a receber o Nobel de Literatura, em 1909.',['A saga de Gösta Berling','A maravilhosa viagem de Nils Holgersson','Jerusalém'],'https://www.nobelprize.org/prizes/literature/1909/lagerlof/biographical/'],
 ['Naguib Mahfouz','Egito','1911–2006','Fez das ruas e famílias do Cairo um universo literário. Seus romances acompanham as transformações da sociedade egípcia. Em 1988, tornou-se o primeiro escritor de língua árabe a receber o Nobel de Literatura.',['Trilogia do Cairo','Miramar','O ladrão e os cães'],'https://sis.gov.eg/en/egypt/egyptian-figures/naguib-mahfouz/']
];
export function writerAlbum(goals,{demo=false}={}){
 const count=demo?8:goals.filter(complete).length;
 return {total:count,slots:WRITERS.map(([name,country,years,bio,works,source],index)=>{
  const id=String(index+1).padStart(2,'0'),unlocked=count>=(index+1)*8;
  return {id,index,unlocked,...(unlocked?{name,country,years,bio,works,source,portrait:'/api/goals/portraits/'+(demo?'demo':id)}:{})};
 })};
}
