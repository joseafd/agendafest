const assert = require('assert');
const {
  enrichArtistsWithOpenMetadata,
  parseWikidataResponse,
  classifyRelationUrls,
  extractMusicBrainzArtistId,
  chooseYoutubeVideo,
  buildWikidataQuery
} = require('../open-metadata');

async function run() {
  let tests = 0;
  let passed = 0;
  async function test(name, fn) {
    tests++;
    try {
      await fn();
      passed++;
      console.log(`🟢 TEST ${tests} PASADO: ${name}`);
    } catch (error) {
      console.error(`🔴 TEST ${tests} FALLADO: ${name}`);
      console.error(error);
    }
  }

  console.log('=== INICIANDO PRUEBAS DE METADATOS ABIERTOS ===\n');

  await test('Wikidata usa Spotify ID y construye RRSS verificables', async () => {
    const spotifyId = '3o2dn2O0FCVsWDFSh8qxgG';
    const query = buildWikidataQuery([spotifyId]);
    assert.ok(query.includes('wdt:P1902'));
    assert.ok(query.includes(spotifyId));
    const result = parseWikidataResponse({ results: { bindings: [{
      spotify: { value: spotifyId },
      instagram: { value: 'sabatonofficial' },
      facebook: { value: 'sabaton' },
      twitter: { value: 'sabaton' },
      tiktok: { value: 'sabatonofficial' },
      youtube: { value: 'UCjQhd1APsd5NQhiVZV7GYzg' }
    }] } });
    const item = result.get(spotifyId);
    assert.strictEqual(item.instagramUrl, 'https://www.instagram.com/sabatonofficial/');
    assert.strictEqual(item.facebookUrl, 'https://www.facebook.com/sabaton');
    assert.strictEqual(item.xUrl, 'https://x.com/sabaton');
    assert.strictEqual(item.tiktokUrl, 'https://www.tiktok.com/@sabatonofficial');
    assert.strictEqual(item.socialSource, 'Wikidata');
  });

  await test('MusicBrainz clasifica relaciones sin inventar dominios', async () => {
    const metadata = classifyRelationUrls([
      { url: { resource: 'https://www.instagram.com/exampleband/' } },
      { url: { resource: 'https://www.facebook.com/exampleband' } },
      { type: 'official homepage', url: { resource: 'https://exampleband.test/' } }
    ]);
    assert.strictEqual(metadata.instagramUrl, 'https://www.instagram.com/exampleband/');
    assert.strictEqual(metadata.facebookUrl, 'https://www.facebook.com/exampleband');
    assert.strictEqual(metadata.officialWebsite, 'https://exampleband.test/');
    assert.strictEqual(extractMusicBrainzArtistId({ relations: [{ artist: { id: 'artist-mbid' } }] }), 'artist-mbid');
  });

  await test('YouTube selecciona un vídeo oficial relacionado con el artista', async () => {
    const selected = chooseYoutubeVideo([
      { id: { videoId: 'wrong' }, snippet: { title: 'Metal compilation', channelTitle: 'Various' } },
      { id: { videoId: 'right' }, snippet: { title: 'Sabaton - Example (Official Music Video)', channelTitle: 'Sabaton' } }
    ], 'Sabaton');
    assert.strictEqual(selected, 'https://www.youtube.com/watch?v=right');
    assert.strictEqual(chooseYoutubeVideo([
      { id: { videoId: 'wrong' }, snippet: { title: 'Unrelated video', channelTitle: 'Other' } }
    ], 'Sabaton'), null);
  });

  await test('La cadena completa combina Wikidata y YouTube una sola vez por artista', async () => {
    const spotifyId = '3o2dn2O0FCVsWDFSh8qxgG';
    let youtubeCalls = 0;
    const lineup = [
      { artistName: 'Sabaton', spotifyId },
      { artistName: 'Sabaton', spotifyId }
    ];
    const enriched = await enrichArtistsWithOpenMetadata(lineup, {
      cache: {},
      enableMusicBrainz: false,
      fetchWikidata: async () => new Map([[spotifyId, {
        instagramUrl: 'https://www.instagram.com/sabatonofficial/',
        socialSource: 'Wikidata'
      }]]),
      fetchYoutube: async () => {
        youtubeCalls++;
        return {
          status: 'found',
          youtubeUrl: 'https://www.youtube.com/watch?v=right',
          youtubeSource: 'YouTube Data API'
        };
      },
      youtubeApiKey: 'test-key'
    });
    assert.strictEqual(youtubeCalls, 1);
    assert.strictEqual(enriched.length, 2);
    assert.strictEqual(enriched[0].instagramUrl, 'https://www.instagram.com/sabatonofficial/');
    assert.strictEqual(enriched[1].youtubeUrl, 'https://www.youtube.com/watch?v=right');
  });

  console.log('\n==================================================');
  console.log(`Metadatos abiertos: ${passed} / ${tests} superadas.`);
  console.log('==================================================');
  process.exit(passed === tests ? 0 : 1);
}

run();
