import type {Guide} from './curated-guides.ts';

/** First-time European itineraries: each pipe-separated stop is a real, mappable place.
 * For multi-city journeys every stop carries its city and country, so geocoding
 * never assumes the previous day's destination. Transfers are planning advice,
 * not promises of a timetable, reservation or service.
 */
export const europeGuides:Guide[]=[
 {
  id:'amsterdam',title:'Ámsterdam',country:'PAÍSES BAJOS',published:true,
  description:'Canales, museos, Jordaan y barrios para recorrer en tres días.',sources:['https://www.iamsterdam.com/en'],days:[
   'Plaza Dam, Ámsterdam, Países Bajos: Empezá en el centro histórico y ubicá las calles principales. | Palacio Real de Ámsterdam, Países Bajos: Conocé su fachada y revisá si hay visitas. | Begijnhof, Ámsterdam, Países Bajos: Visitá este patio histórico con respeto por sus residentes. | Canal Singel, Ámsterdam, Países Bajos: Terminá con un paseo por los canales cercanos.',
   'Rijksmuseum, Ámsterdam, Países Bajos: Reservá un tramo de la mañana para las colecciones que te interesan. | Museumplein, Ámsterdam, Países Bajos: Hacé una pausa en la plaza de museos. | Museo Van Gogh, Ámsterdam, Países Bajos: Entrá solo con reserva y tiempo suficiente. | Vondelpark, Ámsterdam, Países Bajos: Cerrá el día descansando en el parque.',
   'Casa de Ana Frank, Ámsterdam, Países Bajos: Las entradas tienen cupos; reservá únicamente por canales oficiales. | Barrio Jordaan, Ámsterdam, Países Bajos: Caminá por calles y canales. | Negen Straatjes, Ámsterdam, Países Bajos: Descubrí comercios y cafés de las nueve calles. | Canal Prinsengracht, Ámsterdam, Países Bajos: Despedite con un paseo junto al agua.'
  ]
 },
 {
  id:'belgica-clasica',title:'Bruselas, Gante y Brujas',country:'BÉLGICA',published:true,
  description:'Cuatro días por Bélgica: capital, canales medievales y excursiones en tren.',sources:['https://www.visit.brussels/en'],days:[
   'Grand-Place, Bruselas, Bélgica: Descubrí la plaza histórica y sus edificios. | Galeries Royales Saint-Hubert, Bruselas, Bélgica: Paseá por las galerías cubiertas. | Manneken Pis, Bruselas, Bélgica: Acercate al monumento caminando. | Mont des Arts, Bruselas, Bélgica: Terminá entre jardines y vistas de la ciudad.',
   'Atomium, Bruselas, Bélgica: Dedicá la mañana a la zona y comprobá entradas. | Parc du Cinquantenaire, Bruselas, Bélgica: Trasladate en metro para conocer sus arcos y museos. | Barrio europeo, Bruselas, Bélgica: Recorre el entorno de las instituciones. | Place Sainte-Catherine, Bruselas, Bélgica: Elegí un lugar para cenar y cerrar el día.',
   'Estación Gent-Sint-Pieters, Gante, Bélgica: Llegá en tren desde Bruselas y conectá con el casco histórico. | Gravensteen, Gante, Bélgica: Conocé el castillo y consultá horarios. | Graslei y Korenlei, Gante, Bélgica: Paseá por los muelles históricos. | Catedral de San Bavón, Gante, Bélgica: Cerrá entre plazas y patrimonio antes de regresar o dormir en la ciudad.',
   'Estación de Brujas, Brujas, Bélgica: Llegá en tren y caminá hacia el centro. | Grote Markt, Brujas, Bélgica: Descubrí la plaza y el campanario. | Rozenhoedkaai, Brujas, Bélgica: Paseá por los canales y puentes cercanos. | Begijnhof, Brujas, Bélgica: Terminá en esta zona tranquila antes de volver en tren; verificá conexiones.'
  ]
 },
 {
  id:'dublin',title:'Dublín',country:'IRLANDA',published:true,
  description:'Tres días de historia, música y paseos junto al río Liffey.',sources:['https://www.visitdublin.com/'],days:[
   'Trinity College Dublin, Dublín, Irlanda: Conocé el campus y reservá si querés visitar la biblioteca. | Grafton Street, Dublín, Irlanda: Paseá por la calle comercial. | St Stephen’s Green, Dublín, Irlanda: Descansá en el parque. | Temple Bar, Dublín, Irlanda: Conocé el barrio sin depender de sus locales más concurridos.',
   'Castillo de Dublín, Dublín, Irlanda: Revisá horarios para visitar sus espacios históricos. | Catedral de Christ Church, Dublín, Irlanda: Caminá hasta la catedral. | Catedral de San Patricio, Dublín, Irlanda: Continuá por el centro medieval. | Guinness Storehouse, Dublín, Irlanda: Visita opcional de pago con reserva anticipada.',
   'Ha’penny Bridge, Dublín, Irlanda: Cruzá el río Liffey por su puente emblemático. | EPIC The Irish Emigration Museum, Dublín, Irlanda: Explorá la historia de la emigración si te interesa. | Custom House, Dublín, Irlanda: Observá la fachada desde los muelles. | Phoenix Park, Dublín, Irlanda: Trasladate en transporte público para terminar al aire libre.'
  ]
 },
 {
  id:'londres',title:'Londres',country:'REINO UNIDO',published:true,
  description:'Cuatro días entre Westminster, museos, mercados y la ribera del Támesis.',sources:['https://www.visitlondon.com/'],days:[
   'Abadía de Westminster, Londres, Reino Unido: Comenzá por la zona monumental y comprobá acceso interior. | Big Ben y Parlamento, Londres, Reino Unido: Paseá por la plaza y el puente. | London Eye, Londres, Reino Unido: Admirá la ribera; subir es opcional y requiere reservar. | South Bank, Londres, Reino Unido: Terminá caminando junto al Támesis.',
   'Torre de Londres, Reino Unido: Reservá tiempo para la visita histórica. | Tower Bridge, Londres, Reino Unido: Cruzá el puente y disfrutá las vistas. | Borough Market, Londres, Reino Unido: Pausa gastronómica según días y horarios. | Tate Modern, Londres, Reino Unido: Elegí algunas galerías para cerrar la jornada.',
   'Museo Británico, Londres, Reino Unido: Elegí salas concretas en vez de intentar verlo todo. | Covent Garden, Londres, Reino Unido: Paseá por mercados y plazas. | Trafalgar Square, Londres, Reino Unido: Conocé la plaza central. | Soho, Londres, Reino Unido: Cerrá con opciones gastronómicas y teatro según tu presupuesto.',
   'Hyde Park, Londres, Reino Unido: Disfrutá una mañana al aire libre. | Palacio de Buckingham, Londres, Reino Unido: Consultá actos y accesos. | Piccadilly Circus, Londres, Reino Unido: Recorre las calles de compras cercanas. | Carnaby Street, Londres, Reino Unido: Terminá entre comercios y cafés.'
  ]
 },
 {
  id:'edimburgo',title:'Edimburgo',country:'REINO UNIDO',published:true,
  description:'Tres días de castillo, callejones históricos y paisajes de Escocia.',sources:['https://edinburgh.org/'],days:[
   'Castillo de Edimburgo, Edimburgo, Reino Unido: Reservá acceso y dedicá la mañana al recinto. | Royal Mile, Edimburgo, Reino Unido: Bajá por la calle histórica a tu ritmo. | Catedral de St Giles, Edimburgo, Reino Unido: Conocé el interior si está abierto. | Victoria Street, Edimburgo, Reino Unido: Terminá entre fachadas y comercios.',
   'Palacio de Holyroodhouse, Edimburgo, Reino Unido: Verificá aperturas y visitas. | Parlamento Escocés, Edimburgo, Reino Unido: Observá su arquitectura moderna. | Holyrood Park, Edimburgo, Reino Unido: Paseá por los senderos accesibles. | Arthur’s Seat, Edimburgo, Reino Unido: Subida opcional solo con clima y calzado adecuados.',
   'Princes Street Gardens, Edimburgo, Reino Unido: Paseá por los jardines junto a la ciudad vieja. | Scottish National Gallery, Edimburgo, Reino Unido: Elegí una colección. | Dean Village, Edimburgo, Reino Unido: Caminá por la zona del Water of Leith. | Calton Hill, Edimburgo, Reino Unido: Despedite con vistas panorámicas.'
  ]
 },
 {
  id:'grecia',title:'Grecia: Atenas y Santorini',country:'GRECIA',published:true,
  description:'Siete días de historia clásica e islas, con un traslado entre Atenas y Santorini.',sources:['https://www.visitgreece.gr/'],days:[
   'Acrópolis de Atenas, Atenas, Grecia: Reservá entrada y evitá las horas de más calor cuando puedas. | Teatro de Dioniso, Atenas, Grecia: Recorre la ladera sur del sitio arqueológico. | Museo de la Acrópolis, Atenas, Grecia: Elegí salas para profundizar la visita. | Plaka, Atenas, Grecia: Cerrá el día a pie por el barrio histórico.',
   'Ágora Antigua de Atenas, Atenas, Grecia: Conocé el corazón de la ciudad clásica. | Templo de Hefesto, Atenas, Grecia: Recorre el entorno arqueológico. | Monastiraki, Atenas, Grecia: Paseá por tiendas y plazas. | Plaza Syntagma, Atenas, Grecia: Terminá frente al Parlamento.',
   'Museo Arqueológico Nacional, Atenas, Grecia: Visitá una selección de colecciones. | Monte Licabeto, Atenas, Grecia: Subida opcional según clima y energía. | Jardín Nacional de Atenas, Grecia: Descansá a la sombra. | Estadio Panathinaikó, Atenas, Grecia: Terminá con un lugar emblemático del deporte.',
   'Aeropuerto de Atenas, Atenas, Grecia: Reservá buena parte del día para el traslado a Santorini; verificá vuelo o ferry y conexiones. | Fira, Santorini, Grecia: Al llegar, instalate y hacé un paseo breve por la capital de la isla.',
   'Fira, Santorini, Grecia: Empezá con vistas de la caldera. | Firostefani, Santorini, Grecia: Caminá por el sendero panorámico. | Imerovigli, Santorini, Grecia: Continuá solo si el clima y el terreno lo permiten. | Skaros Rock, Santorini, Grecia: Mirador opcional sin asumir que el sendero esté habilitado.',
   'Akrotiri, Santorini, Grecia: Conocé el yacimiento arqueológico si está abierto. | Red Beach, Santorini, Grecia: Observá el paisaje desde zonas permitidas; respetá cierres por desprendimientos. | Pyrgos, Santorini, Grecia: Paseá por el pueblo interior. | Fira, Santorini, Grecia: Regresá para cenar, comprobando horarios de autobuses.',
   'Oia, Santorini, Grecia: Recorre sus callejones y miradores por la mañana. | Ammoudi Bay, Santorini, Grecia: Bajada opcional, teniendo en cuenta el desnivel. | Oia Castle, Santorini, Grecia: Mirador clásico; evitá aglomeraciones. | Fira, Santorini, Grecia: Volvé a tu base y prepará el viaje de salida.'
  ]
 },
 {
  id:'valencia',title:'Valencia',country:'ESPAÑA',published:true,
  description:'Tres días de casco histórico, jardines del Turia y Mediterráneo.',sources:['https://www.visitvalencia.com/'],days:[
   'Plaza de la Virgen, Valencia, España: Arrancá en el centro monumental. | Catedral de Valencia, España: Consultá las visitas y la subida al Miguelete. | Lonja de la Seda, Valencia, España: Conocé este edificio histórico. | Mercado Central de Valencia, España: Pausa gastronómica dentro de sus horarios.',
   'Torres de Serranos, Valencia, España: Empezá por una de las antiguas puertas de la ciudad. | Jardín del Turia, Valencia, España: Recorre un tramo del antiguo cauce. | Ciudad de las Artes y las Ciencias, Valencia, España: Conocé el complejo y elegí interiores con tiempo. | L’Umbracle, Valencia, España: Terminá por sus jardines y arquitectura.',
   'Playa de la Malvarrosa, Valencia, España: Paseá junto al Mediterráneo. | Paseo Marítimo, Valencia, España: Elegí una terraza o almuerzo. | Marina de Valencia, Valencia, España: Acercate al antiguo puerto. | Barrio del Cabanyal, Valencia, España: Cerrá caminando por calles de casas tradicionales.'
  ]
 },
 {
  id:'alicante',title:'Alicante',country:'ESPAÑA',published:true,
  description:'Tres días de castillo, casco antiguo, playas y paseo marítimo.',sources:['https://www.alicanteturismo.com/'],days:[
   'Castillo de Santa Bárbara, Alicante, España: Subí temprano o usá el acceso disponible y disfrutá las vistas. | Barrio de Santa Cruz, Alicante, España: Bajá por sus calles tradicionales sin apuro. | Concatedral de San Nicolás, Alicante, España: Recorre el centro histórico. | Plaza del Ayuntamiento, Alicante, España: Terminá en sus terrazas y plazas.',
   'Explanada de España, Alicante, España: Empezá por el paseo de palmeras. | Puerto de Alicante, Alicante, España: Seguí a pie hacia el mar. | Playa del Postiguet, Alicante, España: Disfrutá la costa y el descanso. | Museo de Arte Contemporáneo de Alicante, España: Visita opcional según horarios.',
   'Mercado Central de Alicante, Alicante, España: Desayuná o conocé los puestos dentro de su horario. | Parque de la Ereta, Alicante, España: Buscá sus miradores y caminos. | Playa de San Juan, Alicante, España: Tomá transporte hasta esta playa más extensa. | Paseo de la playa de San Juan, Alicante, España: Cerrá el viaje frente al Mediterráneo.'
  ]
 },
 {
  id:'europa-14-dias',title:'Europa clásica en 14 días',country:'EUROPA',published:true,
  description:'Roma, Florencia, Venecia, París y Londres en dos semanas, con traslados previstos.',sources:['https://europa.eu/youreurope/citizens/travel/index_es.htm'],days:[
   'Coliseo, Roma, Italia: Primer contacto con Roma; reservá la visita. | Foro Romano, Roma, Italia: Seguí por la zona arqueológica. | Piazza Venezia, Roma, Italia: Terminá en el centro histórico.',
   'Museos Vaticanos, Roma, Italia: Dedicá la mañana al Vaticano con reserva. | Basílica de San Pedro, Ciudad del Vaticano: Visitá el interior si está abierto. | Castel Sant’Angelo, Roma, Italia: Cerrá junto al río.',
   'Panteón de Roma, Roma, Italia: Descubrí el casco antiguo. | Piazza Navona, Roma, Italia: Paseá entre fuentes y plazas. | Fontana di Trevi, Roma, Italia: Continuá a pie. | Trastevere, Roma, Italia: Cena y paseo final.',
   'Estación Firenze Santa Maria Novella, Florencia, Italia: Traslado en tren desde Roma; reservá margen en la mañana. | Catedral de Santa María del Fiore, Florencia, Italia: Conocé el Duomo. | Piazza della Signoria, Florencia, Italia: Paseá por el centro.',
   'Galería Uffizi, Florencia, Italia: Reservá entrada si te interesa el museo. | Ponte Vecchio, Florencia, Italia: Cruzá el puente histórico. | Piazzale Michelangelo, Florencia, Italia: Terminá con vistas de la ciudad.',
   'Estación Venezia Santa Lucia, Venecia, Italia: Viajá en tren desde Florencia y dejá tiempo para instalarte. | Puente de Rialto, Venecia, Italia: Primer paseo por los canales. | Plaza de San Marcos, Venecia, Italia: Cerrá en el entorno monumental.',
   'Palacio Ducal, Venecia, Italia: Visitá el interior con reserva si querés. | Puente de los Suspiros, Venecia, Italia: Descubrí su exterior. | Barrio Dorsoduro, Venecia, Italia: Paseá por una zona más tranquila.',
   'Aeropuerto Marco Polo, Venecia, Italia: Dedicá parte del día al vuelo o conexión hacia París; comprobá rutas reales. | Jardín de las Tullerías, París, Francia: Primer paseo tranquilo tras llegar. | Ribera del Sena, París, Francia: Cerrá junto al río.',
   'Museo del Louvre, París, Francia: Reservá si querés visitar colecciones. | Île de la Cité, París, Francia: Paseo por las islas del Sena. | Catedral de Notre-Dame de París, Francia: Conocé su entorno.',
   'Trocadéro, París, Francia: Mirador de la Torre Eiffel. | Torre Eiffel, París, Francia: Entrá solo si reservaste. | Montmartre, París, Francia: Terminá entre calles y cafés.',
   'Gare du Nord, París, Francia: Viaje a Londres por Eurostar; comprobá controles fronterizos, documentación y horarios. | St Pancras International, Londres, Reino Unido: Llegada y check-in. | Covent Garden, Londres, Reino Unido: Paseo de bienvenida.',
   'Abadía de Westminster, Londres, Reino Unido: Comenzá por la zona parlamentaria. | Big Ben, Londres, Reino Unido: Caminá junto al Támesis. | South Bank, Londres, Reino Unido: Terminá con vistas del río.',
   'Torre de Londres, Reino Unido: Reservá una mañana para la visita. | Tower Bridge, Londres, Reino Unido: Paseo por el puente. | Borough Market, Londres, Reino Unido: Pausa gastronómica.',
   'Museo Británico, Londres, Reino Unido: Elegí salas con tiempo. | Trafalgar Square, Londres, Reino Unido: Paseá por la plaza. | Hyde Park, Londres, Reino Unido: Despedite antes de tu regreso.'
  ]
 },
 {
  id:'europa-21-dias',title:'Gran Europa en 21 días',country:'EUROPA',published:true,
  description:'Italia, Francia, Bélgica, Países Bajos y Reino Unido en tres semanas; ciudades conectadas por tren y un vuelo.',sources:['https://europa.eu/youreurope/citizens/travel/index_es.htm'],days:[
   'Coliseo, Roma, Italia: Primera mañana junto a la historia de Roma. | Foro Romano, Roma, Italia: Continuá por el área arqueológica. | Campidoglio, Roma, Italia: Cerrá con vistas.',
   'Museos Vaticanos, Roma, Italia: Reservá entrada. | Basílica de San Pedro, Ciudad del Vaticano: Visitá si está abierta. | Castel Sant’Angelo, Roma, Italia: Paseo junto al Tíber.',
   'Panteón de Roma, Roma, Italia: Explorá el centro. | Piazza Navona, Roma, Italia: Paseá entre fuentes. | Trastevere, Roma, Italia: Cerrá entre calles y restaurantes.',
   'Estación Firenze Santa Maria Novella, Florencia, Italia: Tren desde Roma por la mañana. | Catedral de Santa María del Fiore, Florencia, Italia: Conocé la catedral. | Piazza della Signoria, Florencia, Italia: Paseá por el centro.',
   'Galería Uffizi, Florencia, Italia: Visita opcional con reserva. | Ponte Vecchio, Florencia, Italia: Recorre el puente. | Piazzale Michelangelo, Florencia, Italia: Mirador al atardecer.',
   'Estación Venezia Santa Lucia, Venecia, Italia: Llegá en tren desde Florencia. | Puente de Rialto, Venecia, Italia: Primer paseo. | Plaza de San Marcos, Venecia, Italia: Conocé la plaza.',
   'Palacio Ducal, Venecia, Italia: Reservá entrada. | Basílica de San Marcos, Venecia, Italia: Comprobá normas y acceso. | Barrio Cannaregio, Venecia, Italia: Paseá por canales menos concurridos.',
   'Aeropuerto Marco Polo, Venecia, Italia: Reservá el día parcial de traslado en avión a París. | Jardin du Luxembourg, París, Francia: Paseo de llegada. | Barrio Latino, París, Francia: Cena tranquila.',
   'Museo del Louvre, París, Francia: Elegí colecciones. | Jardín de las Tullerías, París, Francia: Descanso al aire libre. | Catedral de Notre-Dame de París, Francia: Paseo por el entorno.',
   'Trocadéro, París, Francia: Vistas de la Torre Eiffel. | Torre Eiffel, París, Francia: Visita opcional con reserva. | Montmartre, París, Francia: Terminá por la colina.',
   'Gare du Nord, París, Francia: Tren hacia Bruselas; verificá horarios y reserva. | Grand-Place, Bruselas, Bélgica: Conocé el centro. | Galeries Royales Saint-Hubert, Bruselas, Bélgica: Paseo cubierto.',
   'Estación de Brujas, Brujas, Bélgica: Excursión de ida y vuelta en tren desde Bruselas. | Grote Markt, Brujas, Bélgica: Descubrí la plaza. | Rozenhoedkaai, Brujas, Bélgica: Paseá junto a los canales.',
   'Estación Amsterdam Centraal, Ámsterdam, Países Bajos: Tren desde Bruselas. | Plaza Dam, Ámsterdam, Países Bajos: Primer recorrido céntrico. | Canal Singel, Ámsterdam, Países Bajos: Paseo vespertino.',
   'Rijksmuseum, Ámsterdam, Países Bajos: Visitá algunas salas. | Museumplein, Ámsterdam, Países Bajos: Pausa en la plaza. | Vondelpark, Ámsterdam, Países Bajos: Caminata relajada.',
   'Casa de Ana Frank, Ámsterdam, Países Bajos: Reservá con antelación. | Barrio Jordaan, Ámsterdam, Países Bajos: Paseá junto a canales. | Negen Straatjes, Ámsterdam, Países Bajos: Terminá entre comercios.',
   'Amsterdam Centraal, Ámsterdam, Países Bajos: Tren a Londres; verificá controles de pasaporte y conexiones. | St Pancras International, Londres, Reino Unido: Llegada y descanso. | Covent Garden, Londres, Reino Unido: Paseo corto.',
   'Abadía de Westminster, Londres, Reino Unido: Visitá el entorno. | Big Ben, Londres, Reino Unido: SeguÍ por Westminster. | South Bank, Londres, Reino Unido: Ribera del Támesis.',
   'Torre de Londres, Reino Unido: Entrada opcional. | Tower Bridge, Londres, Reino Unido: Cruzá el puente. | Borough Market, Londres, Reino Unido: Pausa gastronómica.',
   'Estación London King’s Cross, Londres, Reino Unido: Viajá en tren a Edimburgo y reservá una parte del día. | Royal Mile, Edimburgo, Reino Unido: Paseo de llegada. | Catedral de St Giles, Edimburgo, Reino Unido: Conocé la fachada.',
   'Castillo de Edimburgo, Edimburgo, Reino Unido: Reservá una visita. | Victoria Street, Edimburgo, Reino Unido: Paseo por el casco antiguo. | Grassmarket, Edimburgo, Reino Unido: Terminá en la plaza.',
   'Princes Street Gardens, Edimburgo, Reino Unido: Empezá en los jardines. | Dean Village, Edimburgo, Reino Unido: Paseá por el río. | Calton Hill, Edimburgo, Reino Unido: Despedida con vistas antes del regreso.'
  ]
 }
];
