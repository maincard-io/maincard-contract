const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getCardsGraphQL() {
  const result = {
    "data": {
      "cards": [
        {
          "cardId": "70657"
        },
        {
          "cardId": "70660"
        },
        {
          "cardId": "70676"
        },
        {
          "cardId": "70680"
        },
        {
          "cardId": "70692"
        },
        {
          "cardId": "70723"
        },
        {
          "cardId": "70726"
        },
        {
          "cardId": "70728"
        },
        {
          "cardId": "70735"
        },
        {
          "cardId": "70741"
        },
        {
          "cardId": "70743"
        },
        {
          "cardId": "70756"
        },
        {
          "cardId": "70757"
        },
        {
          "cardId": "70758"
        },
        {
          "cardId": "70762"
        },
        {
          "cardId": "70763"
        },
        {
          "cardId": "70764"
        },
        {
          "cardId": "70765"
        },
        {
          "cardId": "70766"
        },
        {
          "cardId": "70767"
        },
        {
          "cardId": "70770"
        },
        {
          "cardId": "70781"
        },
        {
          "cardId": "70787"
        },
        {
          "cardId": "70790"
        },
        {
          "cardId": "70792"
        },
        {
          "cardId": "70796"
        },
        {
          "cardId": "70799"
        },
        {
          "cardId": "70800"
        },
        {
          "cardId": "70801"
        },
        {
          "cardId": "70803"
        },
        {
          "cardId": "70810"
        },
        {
          "cardId": "70811"
        },
        {
          "cardId": "70849"
        },
        {
          "cardId": "70874"
        },
        {
          "cardId": "70875"
        },
        {
          "cardId": "70877"
        },
        {
          "cardId": "70878"
        },
        {
          "cardId": "70896"
        },
        {
          "cardId": "70933"
        },
        {
          "cardId": "70936"
        },
        {
          "cardId": "70937"
        },
        {
          "cardId": "70938"
        },
        {
          "cardId": "70939"
        },
        {
          "cardId": "70940"
        },
        {
          "cardId": "70959"
        },
        {
          "cardId": "70973"
        },
        {
          "cardId": "70975"
        },
        {
          "cardId": "70976"
        },
        {
          "cardId": "70977"
        },
        {
          "cardId": "70982"
        },
        {
          "cardId": "70993"
        },
        {
          "cardId": "70994"
        },
        {
          "cardId": "71002"
        },
        {
          "cardId": "71034"
        },
        {
          "cardId": "71048"
        },
        {
          "cardId": "71049"
        },
        {
          "cardId": "71096"
        },
        {
          "cardId": "71208"
        },
        {
          "cardId": "71211"
        },
        {
          "cardId": "71214"
        },
        {
          "cardId": "71216"
        },
        {
          "cardId": "71220"
        },
        {
          "cardId": "71221"
        },
        {
          "cardId": "71222"
        },
        {
          "cardId": "71225"
        },
        {
          "cardId": "71228"
        },
        {
          "cardId": "71233"
        },
        {
          "cardId": "71253"
        },
        {
          "cardId": "71296"
        },
        {
          "cardId": "71297"
        },
        {
          "cardId": "71299"
        },
        {
          "cardId": "71358"
        },
        {
          "cardId": "71371"
        },
        {
          "cardId": "71377"
        },
        {
          "cardId": "71380"
        },
        {
          "cardId": "71385"
        },
        {
          "cardId": "71386"
        },
        {
          "cardId": "71387"
        },
        {
          "cardId": "71430"
        },
        {
          "cardId": "71431"
        },
        {
          "cardId": "71433"
        },
        {
          "cardId": "71435"
        },
        {
          "cardId": "71446"
        },
        {
          "cardId": "71447"
        },
        {
          "cardId": "71449"
        },
        {
          "cardId": "71450"
        },
        {
          "cardId": "71453"
        },
        {
          "cardId": "71454"
        },
        {
          "cardId": "71455"
        },
        {
          "cardId": "71463"
        },
        {
          "cardId": "71464"
        },
        {
          "cardId": "71465"
        },
        {
          "cardId": "71467"
        },
        {
          "cardId": "71468"
        },
        {
          "cardId": "71471"
        },
        {
          "cardId": "71479"
        },
        {
          "cardId": "71484"
        },
        {
          "cardId": "71491"
        },
        {
          "cardId": "71492"
        },
        {
          "cardId": "71494"
        },
        {
          "cardId": "71495"
        },
        {
          "cardId": "71502"
        },
        {
          "cardId": "71507"
        },
        {
          "cardId": "71512"
        },
        {
          "cardId": "71516"
        },
        {
          "cardId": "71518"
        },
        {
          "cardId": "71519"
        },
        {
          "cardId": "71521"
        },
        {
          "cardId": "71530"
        },
        {
          "cardId": "71531"
        },
        {
          "cardId": "71532"
        },
        {
          "cardId": "71533"
        },
        {
          "cardId": "71535"
        },
        {
          "cardId": "71583"
        },
        {
          "cardId": "71586"
        },
        {
          "cardId": "71587"
        },
        {
          "cardId": "71588"
        },
        {
          "cardId": "71589"
        },
        {
          "cardId": "71590"
        },
        {
          "cardId": "71598"
        },
        {
          "cardId": "71612"
        },
        {
          "cardId": "71617"
        },
        {
          "cardId": "71639"
        },
        {
          "cardId": "71640"
        },
        {
          "cardId": "71642"
        },
        {
          "cardId": "71679"
        },
        {
          "cardId": "71687"
        },
        {
          "cardId": "71688"
        },
        {
          "cardId": "71689"
        },
        {
          "cardId": "71692"
        },
        {
          "cardId": "71693"
        },
        {
          "cardId": "71695"
        },
        {
          "cardId": "71696"
        },
        {
          "cardId": "71697"
        },
        {
          "cardId": "71698"
        },
        {
          "cardId": "71699"
        },
        {
          "cardId": "71700"
        },
        {
          "cardId": "71701"
        },
        {
          "cardId": "71703"
        },
        {
          "cardId": "71704"
        },
        {
          "cardId": "71705"
        },
        {
          "cardId": "71706"
        },
        {
          "cardId": "71707"
        },
        {
          "cardId": "71708"
        },
        {
          "cardId": "71709"
        },
        {
          "cardId": "71710"
        },
        {
          "cardId": "71712"
        },
        {
          "cardId": "71714"
        },
        {
          "cardId": "71716"
        },
        {
          "cardId": "71720"
        },
        {
          "cardId": "71721"
        },
        {
          "cardId": "71724"
        },
        {
          "cardId": "71725"
        },
        {
          "cardId": "71730"
        },
        {
          "cardId": "71732"
        },
        {
          "cardId": "71736"
        },
        {
          "cardId": "71740"
        },
        {
          "cardId": "71741"
        },
        {
          "cardId": "71749"
        },
        {
          "cardId": "71751"
        },
        {
          "cardId": "71754"
        },
        {
          "cardId": "71756"
        },
        {
          "cardId": "71757"
        },
        {
          "cardId": "71760"
        },
        {
          "cardId": "71761"
        },
        {
          "cardId": "71762"
        },
        {
          "cardId": "71764"
        },
        {
          "cardId": "71765"
        },
        {
          "cardId": "71766"
        },
        {
          "cardId": "71768"
        },
        {
          "cardId": "71769"
        },
        {
          "cardId": "71770"
        },
        {
          "cardId": "71771"
        },
        {
          "cardId": "71772"
        },
        {
          "cardId": "71773"
        },
        {
          "cardId": "71775"
        },
        {
          "cardId": "71777"
        },
        {
          "cardId": "71778"
        },
        {
          "cardId": "71779"
        },
        {
          "cardId": "71780"
        },
        {
          "cardId": "71783"
        },
        {
          "cardId": "71784"
        },
        {
          "cardId": "71813"
        },
        {
          "cardId": "71816"
        },
        {
          "cardId": "71818"
        },
        {
          "cardId": "71821"
        },
        {
          "cardId": "71822"
        },
        {
          "cardId": "71825"
        },
        {
          "cardId": "71828"
        },
        {
          "cardId": "71829"
        },
        {
          "cardId": "71832"
        },
        {
          "cardId": "71835"
        },
        {
          "cardId": "71841"
        },
        {
          "cardId": "71842"
        },
        {
          "cardId": "71843"
        },
        {
          "cardId": "71846"
        },
        {
          "cardId": "71849"
        },
        {
          "cardId": "71850"
        },
        {
          "cardId": "71851"
        },
        {
          "cardId": "71852"
        },
        {
          "cardId": "71856"
        },
        {
          "cardId": "71864"
        },
        {
          "cardId": "71866"
        },
        {
          "cardId": "71867"
        },
        {
          "cardId": "71868"
        },
        {
          "cardId": "71869"
        },
        {
          "cardId": "4492"
        },
        {
          "cardId": "71874"
        },
        {
          "cardId": "71875"
        },
        {
          "cardId": "71877"
        },
        {
          "cardId": "71879"
        },
        {
          "cardId": "71881"
        },
        {
          "cardId": "71883"
        },
        {
          "cardId": "71886"
        },
        {
          "cardId": "71887"
        },
        {
          "cardId": "71892"
        },
        {
          "cardId": "71893"
        },
        {
          "cardId": "71894"
        },
        {
          "cardId": "71896"
        },
        {
          "cardId": "71897"
        },
        {
          "cardId": "71899"
        },
        {
          "cardId": "71906"
        },
        {
          "cardId": "71907"
        },
        {
          "cardId": "71908"
        },
        {
          "cardId": "71909"
        },
        {
          "cardId": "71910"
        },
        {
          "cardId": "71914"
        },
        {
          "cardId": "71915"
        },
        {
          "cardId": "71917"
        },
        {
          "cardId": "71918"
        },
        {
          "cardId": "71924"
        },
        {
          "cardId": "71926"
        },
        {
          "cardId": "71928"
        },
        {
          "cardId": "71929"
        },
        {
          "cardId": "71930"
        },
        {
          "cardId": "71934"
        },
        {
          "cardId": "71935"
        },
        {
          "cardId": "71936"
        },
        {
          "cardId": "71939"
        },
        {
          "cardId": "71942"
        },
        {
          "cardId": "71945"
        },
        {
          "cardId": "71946"
        },
        {
          "cardId": "71952"
        },
        {
          "cardId": "71953"
        },
        {
          "cardId": "71956"
        },
        {
          "cardId": "71968"
        },
        {
          "cardId": "71969"
        },
        {
          "cardId": "71973"
        },
        {
          "cardId": "71974"
        },
        {
          "cardId": "71975"
        },
        {
          "cardId": "71976"
        },
        {
          "cardId": "71977"
        },
        {
          "cardId": "71980"
        },
        {
          "cardId": "71981"
        },
        {
          "cardId": "71982"
        },
        {
          "cardId": "71996"
        },
        {
          "cardId": "71997"
        },
        {
          "cardId": "72001"
        },
        {
          "cardId": "72011"
        },
        {
          "cardId": "72013"
        },
        {
          "cardId": "72014"
        },
        {
          "cardId": "72015"
        },
        {
          "cardId": "72016"
        },
        {
          "cardId": "72017"
        },
        {
          "cardId": "72018"
        },
        {
          "cardId": "72020"
        },
        {
          "cardId": "72021"
        },
        {
          "cardId": "72022"
        },
        {
          "cardId": "72026"
        },
        {
          "cardId": "72027"
        },
        {
          "cardId": "72028"
        },
        {
          "cardId": "72030"
        },
        {
          "cardId": "72031"
        },
        {
          "cardId": "72032"
        },
        {
          "cardId": "72035"
        },
        {
          "cardId": "72041"
        },
        {
          "cardId": "72043"
        },
        {
          "cardId": "72045"
        },
        {
          "cardId": "72050"
        },
        {
          "cardId": "72053"
        },
        {
          "cardId": "72054"
        },
        {
          "cardId": "72055"
        },
        {
          "cardId": "72057"
        },
        {
          "cardId": "72074"
        },
        {
          "cardId": "72076"
        },
        {
          "cardId": "72077"
        },
        {
          "cardId": "72078"
        },
        {
          "cardId": "72080"
        },
        {
          "cardId": "72082"
        },
        {
          "cardId": "72085"
        },
        {
          "cardId": "72087"
        },
        {
          "cardId": "72091"
        },
        {
          "cardId": "72092"
        },
        {
          "cardId": "72093"
        },
        {
          "cardId": "72094"
        },
        {
          "cardId": "72095"
        },
        {
          "cardId": "72097"
        },
        {
          "cardId": "72101"
        },
        {
          "cardId": "72102"
        },
        {
          "cardId": "72105"
        },
        {
          "cardId": "72110"
        },
        {
          "cardId": "72111"
        },
        {
          "cardId": "72114"
        },
        {
          "cardId": "72115"
        },
        {
          "cardId": "72126"
        },
        {
          "cardId": "72139"
        },
        {
          "cardId": "72142"
        },
        {
          "cardId": "72148"
        },
        {
          "cardId": "72163"
        },
        {
          "cardId": "72164"
        },
        {
          "cardId": "72167"
        },
        {
          "cardId": "72182"
        },
        {
          "cardId": "72192"
        },
        {
          "cardId": "72198"
        },
        {
          "cardId": "72203"
        },
        {
          "cardId": "72205"
        },
        {
          "cardId": "72206"
        },
        {
          "cardId": "72212"
        },
        {
          "cardId": "72213"
        },
        {
          "cardId": "72215"
        },
        {
          "cardId": "72216"
        },
        {
          "cardId": "72220"
        },
        {
          "cardId": "72222"
        },
        {
          "cardId": "72233"
        },
        {
          "cardId": "72258"
        },
        {
          "cardId": "72276"
        },
        {
          "cardId": "72281"
        },
        {
          "cardId": "72284"
        },
        {
          "cardId": "72286"
        },
        {
          "cardId": "72307"
        },
        {
          "cardId": "72326"
        },
        {
          "cardId": "72334"
        },
        {
          "cardId": "72349"
        },
        {
          "cardId": "72366"
        },
        {
          "cardId": "72370"
        },
        {
          "cardId": "72371"
        },
        {
          "cardId": "72827"
        },
        {
          "cardId": "72829"
        },
        {
          "cardId": "72833"
        },
        {
          "cardId": "72834"
        },
        {
          "cardId": "72837"
        },
        {
          "cardId": "72839"
        },
        {
          "cardId": "72840"
        },
        {
          "cardId": "72875"
        },
        {
          "cardId": "72879"
        },
        {
          "cardId": "72894"
        },
        {
          "cardId": "72895"
        },
        {
          "cardId": "72896"
        },
        {
          "cardId": "72899"
        },
        {
          "cardId": "72904"
        },
        {
          "cardId": "72905"
        },
        {
          "cardId": "72926"
        },
        {
          "cardId": "72938"
        },
        {
          "cardId": "72939"
        },
        {
          "cardId": "72942"
        },
        {
          "cardId": "72944"
        },
        {
          "cardId": "72946"
        },
        {
          "cardId": "72948"
        },
        {
          "cardId": "72949"
        },
        {
          "cardId": "72953"
        },
        {
          "cardId": "72956"
        },
        {
          "cardId": "72964"
        },
        {
          "cardId": "72970"
        },
        {
          "cardId": "72972"
        },
        {
          "cardId": "72978"
        },
        {
          "cardId": "72981"
        },
        {
          "cardId": "72988"
        },
        {
          "cardId": "72994"
        },
        {
          "cardId": "72998"
        },
        {
          "cardId": "73003"
        },
        {
          "cardId": "73005"
        },
        {
          "cardId": "73006"
        },
        {
          "cardId": "73009"
        },
        {
          "cardId": "73010"
        },
        {
          "cardId": "73015"
        },
        {
          "cardId": "73018"
        },
        {
          "cardId": "73028"
        },
        {
          "cardId": "73037"
        },
        {
          "cardId": "73046"
        },
        {
          "cardId": "73060"
        },
        {
          "cardId": "73061"
        },
        {
          "cardId": "73062"
        },
        {
          "cardId": "73072"
        },
        {
          "cardId": "73090"
        },
        {
          "cardId": "73098"
        },
        {
          "cardId": "73099"
        },
        {
          "cardId": "73101"
        },
        {
          "cardId": "73141"
        },
        {
          "cardId": "73143"
        },
        {
          "cardId": "73179"
        },
        {
          "cardId": "73207"
        },
        {
          "cardId": "73294"
        },
        {
          "cardId": "73298"
        },
        {
          "cardId": "73320"
        },
        {
          "cardId": "73321"
        },
        {
          "cardId": "73323"
        },
        {
          "cardId": "73325"
        },
        {
          "cardId": "73326"
        },
        {
          "cardId": "73327"
        },
        {
          "cardId": "73329"
        },
        {
          "cardId": "73330"
        },
        {
          "cardId": "73398"
        },
        {
          "cardId": "73400"
        },
        {
          "cardId": "73467"
        },
        {
          "cardId": "73472"
        },
        {
          "cardId": "73568"
        },
        {
          "cardId": "73572"
        },
        {
          "cardId": "73590"
        },
        {
          "cardId": "73684"
        },
        {
          "cardId": "4651"
        },
        {
          "cardId": "4668"
        },
        {
          "cardId": "75231"
        },
        {
          "cardId": "76080"
        },
        {
          "cardId": "76207"
        },
        {
          "cardId": "76208"
        },
        {
          "cardId": "76209"
        },
        {
          "cardId": "76211"
        },
        {
          "cardId": "76221"
        },
        {
          "cardId": "76222"
        },
        {
          "cardId": "76226"
        },
        {
          "cardId": "76227"
        },
        {
          "cardId": "76229"
        },
        {
          "cardId": "76231"
        },
        {
          "cardId": "76233"
        },
        {
          "cardId": "76235"
        },
        {
          "cardId": "76238"
        },
        {
          "cardId": "76336"
        },
        {
          "cardId": "76338"
        },
        {
          "cardId": "76340"
        },
        {
          "cardId": "76341"
        },
        {
          "cardId": "76342"
        },
        {
          "cardId": "76683"
        },
        {
          "cardId": "76687"
        },
        {
          "cardId": "76695"
        },
        {
          "cardId": "77316"
        },
        {
          "cardId": "77339"
        },
        {
          "cardId": "4863"
        },
        {
          "cardId": "4867"
        },
        {
          "cardId": "4880"
        },
        {
          "cardId": "4881"
        },
        {
          "cardId": "78379"
        },
        {
          "cardId": "78453"
        },
        {
          "cardId": "4904"
        },
        {
          "cardId": "78516"
        },
        {
          "cardId": "78521"
        },
        {
          "cardId": "78530"
        },
        {
          "cardId": "78554"
        },
        {
          "cardId": "78563"
        },
        {
          "cardId": "78565"
        },
        {
          "cardId": "78583"
        },
        {
          "cardId": "78602"
        },
        {
          "cardId": "78613"
        },
        {
          "cardId": "78619"
        },
        {
          "cardId": "78626"
        },
        {
          "cardId": "78629"
        },
        {
          "cardId": "78634"
        },
        {
          "cardId": "78635"
        },
        {
          "cardId": "78637"
        },
        {
          "cardId": "78638"
        },
        {
          "cardId": "78639"
        },
        {
          "cardId": "78647"
        },
        {
          "cardId": "78649"
        },
        {
          "cardId": "78651"
        },
        {
          "cardId": "78655"
        },
        {
          "cardId": "78660"
        },
        {
          "cardId": "78680"
        },
        {
          "cardId": "78686"
        },
        {
          "cardId": "78708"
        },
        {
          "cardId": "78710"
        },
        {
          "cardId": "78729"
        },
        {
          "cardId": "78750"
        },
        {
          "cardId": "78754"
        },
        {
          "cardId": "78758"
        },
        {
          "cardId": "78762"
        },
        {
          "cardId": "78763"
        },
        {
          "cardId": "78769"
        },
        {
          "cardId": "78775"
        },
        {
          "cardId": "78783"
        },
        {
          "cardId": "78793"
        },
        {
          "cardId": "78801"
        },
        {
          "cardId": "78808"
        },
        {
          "cardId": "78814"
        },
        {
          "cardId": "78817"
        },
        {
          "cardId": "78847"
        },
        {
          "cardId": "4928"
        },
        {
          "cardId": "78870"
        },
        {
          "cardId": "78877"
        },
        {
          "cardId": "78885"
        },
        {
          "cardId": "78887"
        },
        {
          "cardId": "78899"
        },
        {
          "cardId": "78907"
        },
        {
          "cardId": "78931"
        },
        {
          "cardId": "78933"
        },
        {
          "cardId": "78961"
        },
        {
          "cardId": "78973"
        },
        {
          "cardId": "78977"
        },
        {
          "cardId": "78984"
        },
        {
          "cardId": "79001"
        },
        {
          "cardId": "79007"
        },
        {
          "cardId": "79025"
        }
      ]
    }
  }
  return { status: 'success', results: result.data.cards.map(c => ({ token_id: c.cardId })) }
}

async function getAllArenaCards() {
  const raw = `65654 65735`
  const cards = raw.match(/\d+/g).map(Number)
  // return { status: 'success', results: cards.map(c => ({ token_id: c })) }


  const result = await fetch('https://api.transpose.io/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': 'ZShKa3skvhFDxUYTiax4hvS2Eog1F1z9'
    },
    body: JSON.stringify({
      'sql': 'with tokens_on_arena as (select token_id from polygon.nft_owners where contract_address = \'0x3D9e6bD43aC6afc78f3D8C8df6811D9aB53678c1\' and owner_address = \'0x24c6f0C81Cc8E6fc9348Fb3ab5338F903A5B7959\')  select * from tokens_on_arena order by token_id desc;      ',
      'parameters': {},
      'options': {}
    })
  });
  if (result.status !== 200)
    throw Error("Unable to fetch cards")
  return await result.json()
}

async function main(cards) {
  const [admin] = await ethers.getSigners();
  console.log("Admin: ", admin);

  const Arena = await ethers.getContractFactory("Arena");
  const arenaProxy = getNamedAccount("arenaProxy");
  const arenaContract = Arena.attach(arenaProxy)

  const mcall = "0xcA11bde05977b3631167028862bE2a173976CA11";
  const mcallabi = [
    "function aggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes[] returnData)",
    "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
    "function aggregate3Value(tuple(address target, bool allowFailure, uint256 value, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
    "function blockAndAggregate(tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)",
    "function getBasefee() view returns (uint256 basefee)",
    "function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)",
    "function getBlockNumber() view returns (uint256 blockNumber)",
    "function getChainId() view returns (uint256 chainid)",
    "function getCurrentBlockCoinbase() view returns (address coinbase)",
    "function getCurrentBlockDifficulty() view returns (uint256 difficulty)",
    "function getCurrentBlockGasLimit() view returns (uint256 gaslimit)",
    "function getCurrentBlockTimestamp() view returns (uint256 timestamp)",
    "function getEthBalance(address addr) view returns (uint256 balance)",
    "function getLastBlockHash() view returns (bytes32 blockHash)",
    "function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
    "function tryBlockAndAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) payable returns (uint256 blockNumber, bytes32 blockHash, tuple(bool success, bytes returnData)[] returnData)",
  ]

  const mcallContract = new ethers.Contract(mcall, mcallabi, admin)
  let pos = 0
  const batchSize = 100;
  let agg = [];

  let currentNonce = await ethers.provider.getTransactionCount(admin.address)
  console.log("Admin's nonce", currentNonce)
  while (pos < cards.length) {
    for (let i = 0; i < batchSize && pos + i < cards.length; ++i) {
      const txData = await arenaContract.populateTransaction.takeCard(cards[i + pos], { gasLimit: 10000, gasPrice: 10000, nonce: 0 });
      agg.push([arenaProxy, true, txData.data])
    }
    console.log("Sending batch...", pos, "+", agg.length)
    const tx = await mcallContract.aggregate3(agg, { nonce: currentNonce })
    currentNonce += 1
    console.log(tx.hash)
    await tx.wait()
    agg = []
    pos += batchSize;
  }
}

/*
List of cards is compued like:

with tokens_on_arena as (select token_id from polygon.nft_owners
where contract_address = '0x3D9e6bD43aC6afc78f3D8C8df6811D9aB53678c1' and
      owner_address = '0x24c6f0C81Cc8E6fc9348Fb3ab5338F903A5B7959')

select * from tokens_on_arena
order by token_id desc;

using transpose.io.

It contains some cards which are in progress,
by design it is impossible to remove them,
so it is safe. Yes, we are paying some extra costs
for trying, but SQL is simpler on the other hand.
*/

// getAllArenaCards().then(
getCardsGraphQL().then(
  result => {
    if (result.status !== 'success')
      throw new Error('result was not successful')
    console.log("Fetched ", result.results.length, " cards")
    console.log(result.results)
    return main(result.results.map(r => r.token_id))
  }
)