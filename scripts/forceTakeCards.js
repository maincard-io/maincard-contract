const { ethers, upgrades } = require("hardhat");
const getNamedAccount = require("./DEPLOYMENTS.js")
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function getCardsGraphQL() {
  const result = {
    "data": {
      "cards": [
        {
          "cardId": "65551"
        },
        {
          "cardId": "65556"
        },
        {
          "cardId": "65593"
        },
        {
          "cardId": "65619"
        },
        {
          "cardId": "65625"
        },
        {
          "cardId": "65632"
        },
        {
          "cardId": "65654"
        },
        {
          "cardId": "65663"
        },
        {
          "cardId": "65674"
        },
        {
          "cardId": "65681"
        },
        {
          "cardId": "65706"
        },
        {
          "cardId": "65711"
        },
        {
          "cardId": "65713"
        },
        {
          "cardId": "65716"
        },
        {
          "cardId": "65730"
        },
        {
          "cardId": "65763"
        },
        {
          "cardId": "65804"
        },
        {
          "cardId": "65807"
        },
        {
          "cardId": "65813"
        },
        {
          "cardId": "65848"
        },
        {
          "cardId": "65849"
        },
        {
          "cardId": "65867"
        },
        {
          "cardId": "65884"
        },
        {
          "cardId": "65910"
        },
        {
          "cardId": "65920"
        },
        {
          "cardId": "65925"
        },
        {
          "cardId": "65948"
        },
        {
          "cardId": "65962"
        },
        {
          "cardId": "65976"
        },
        {
          "cardId": "66008"
        },
        {
          "cardId": "66096"
        },
        {
          "cardId": "66145"
        },
        {
          "cardId": "66159"
        },
        {
          "cardId": "66681"
        },
        {
          "cardId": "66682"
        },
        {
          "cardId": "66694"
        },
        {
          "cardId": "66702"
        },
        {
          "cardId": "66707"
        },
        {
          "cardId": "66712"
        },
        {
          "cardId": "66713"
        },
        {
          "cardId": "66715"
        },
        {
          "cardId": "66716"
        },
        {
          "cardId": "66728"
        },
        {
          "cardId": "66736"
        },
        {
          "cardId": "66741"
        },
        {
          "cardId": "66743"
        },
        {
          "cardId": "66749"
        },
        {
          "cardId": "66754"
        },
        {
          "cardId": "66786"
        },
        {
          "cardId": "66792"
        },
        {
          "cardId": "66799"
        },
        {
          "cardId": "66803"
        },
        {
          "cardId": "66804"
        },
        {
          "cardId": "66808"
        },
        {
          "cardId": "66809"
        },
        {
          "cardId": "66810"
        },
        {
          "cardId": "66811"
        },
        {
          "cardId": "66812"
        },
        {
          "cardId": "66817"
        },
        {
          "cardId": "66818"
        },
        {
          "cardId": "66821"
        },
        {
          "cardId": "66828"
        },
        {
          "cardId": "66835"
        },
        {
          "cardId": "66839"
        },
        {
          "cardId": "66849"
        },
        {
          "cardId": "66852"
        },
        {
          "cardId": "66856"
        },
        {
          "cardId": "66871"
        },
        {
          "cardId": "66874"
        },
        {
          "cardId": "66879"
        },
        {
          "cardId": "66886"
        },
        {
          "cardId": "66888"
        },
        {
          "cardId": "66891"
        },
        {
          "cardId": "66893"
        },
        {
          "cardId": "66896"
        },
        {
          "cardId": "66913"
        },
        {
          "cardId": "66915"
        },
        {
          "cardId": "66919"
        },
        {
          "cardId": "66921"
        },
        {
          "cardId": "66927"
        },
        {
          "cardId": "66930"
        },
        {
          "cardId": "66942"
        },
        {
          "cardId": "66944"
        },
        {
          "cardId": "66954"
        },
        {
          "cardId": "66955"
        },
        {
          "cardId": "66974"
        },
        {
          "cardId": "66977"
        },
        {
          "cardId": "66979"
        },
        {
          "cardId": "66980"
        },
        {
          "cardId": "67000"
        },
        {
          "cardId": "67002"
        },
        {
          "cardId": "67022"
        },
        {
          "cardId": "67026"
        },
        {
          "cardId": "67031"
        },
        {
          "cardId": "67032"
        },
        {
          "cardId": "67039"
        },
        {
          "cardId": "67040"
        },
        {
          "cardId": "67041"
        },
        {
          "cardId": "67056"
        },
        {
          "cardId": "67057"
        },
        {
          "cardId": "67075"
        },
        {
          "cardId": "67081"
        },
        {
          "cardId": "67084"
        },
        {
          "cardId": "67087"
        },
        {
          "cardId": "67089"
        },
        {
          "cardId": "67093"
        },
        {
          "cardId": "67094"
        },
        {
          "cardId": "67099"
        },
        {
          "cardId": "67101"
        },
        {
          "cardId": "67103"
        },
        {
          "cardId": "67108"
        },
        {
          "cardId": "67109"
        },
        {
          "cardId": "67113"
        },
        {
          "cardId": "67114"
        },
        {
          "cardId": "67123"
        },
        {
          "cardId": "67131"
        },
        {
          "cardId": "67134"
        },
        {
          "cardId": "67140"
        },
        {
          "cardId": "67143"
        },
        {
          "cardId": "67148"
        },
        {
          "cardId": "67152"
        },
        {
          "cardId": "67155"
        },
        {
          "cardId": "67159"
        },
        {
          "cardId": "67161"
        },
        {
          "cardId": "67162"
        },
        {
          "cardId": "67166"
        },
        {
          "cardId": "67167"
        },
        {
          "cardId": "67169"
        },
        {
          "cardId": "67171"
        },
        {
          "cardId": "67175"
        },
        {
          "cardId": "67180"
        },
        {
          "cardId": "67181"
        },
        {
          "cardId": "67182"
        },
        {
          "cardId": "67186"
        },
        {
          "cardId": "67187"
        },
        {
          "cardId": "67190"
        },
        {
          "cardId": "67194"
        },
        {
          "cardId": "67201"
        },
        {
          "cardId": "67202"
        },
        {
          "cardId": "67206"
        },
        {
          "cardId": "67208"
        },
        {
          "cardId": "67213"
        },
        {
          "cardId": "67217"
        },
        {
          "cardId": "67219"
        },
        {
          "cardId": "67220"
        },
        {
          "cardId": "67223"
        },
        {
          "cardId": "67224"
        },
        {
          "cardId": "67228"
        },
        {
          "cardId": "67233"
        },
        {
          "cardId": "67240"
        },
        {
          "cardId": "67248"
        },
        {
          "cardId": "67249"
        },
        {
          "cardId": "67250"
        },
        {
          "cardId": "67260"
        },
        {
          "cardId": "67266"
        },
        {
          "cardId": "67269"
        },
        {
          "cardId": "67271"
        },
        {
          "cardId": "67279"
        },
        {
          "cardId": "67280"
        },
        {
          "cardId": "67286"
        },
        {
          "cardId": "67287"
        },
        {
          "cardId": "67289"
        },
        {
          "cardId": "67294"
        },
        {
          "cardId": "67295"
        },
        {
          "cardId": "67301"
        },
        {
          "cardId": "67302"
        },
        {
          "cardId": "67314"
        },
        {
          "cardId": "67320"
        },
        {
          "cardId": "67340"
        },
        {
          "cardId": "67362"
        },
        {
          "cardId": "67372"
        },
        {
          "cardId": "67375"
        },
        {
          "cardId": "67377"
        },
        {
          "cardId": "67379"
        },
        {
          "cardId": "67389"
        },
        {
          "cardId": "67393"
        },
        {
          "cardId": "67394"
        },
        {
          "cardId": "67400"
        },
        {
          "cardId": "67402"
        },
        {
          "cardId": "67404"
        },
        {
          "cardId": "67418"
        },
        {
          "cardId": "67427"
        },
        {
          "cardId": "67432"
        },
        {
          "cardId": "67433"
        },
        {
          "cardId": "67440"
        },
        {
          "cardId": "67443"
        },
        {
          "cardId": "67454"
        },
        {
          "cardId": "67458"
        },
        {
          "cardId": "67462"
        },
        {
          "cardId": "67475"
        },
        {
          "cardId": "67476"
        },
        {
          "cardId": "67479"
        },
        {
          "cardId": "67480"
        },
        {
          "cardId": "67483"
        },
        {
          "cardId": "67490"
        },
        {
          "cardId": "67497"
        },
        {
          "cardId": "67498"
        },
        {
          "cardId": "67503"
        },
        {
          "cardId": "67514"
        },
        {
          "cardId": "67516"
        },
        {
          "cardId": "67529"
        },
        {
          "cardId": "67537"
        },
        {
          "cardId": "67540"
        },
        {
          "cardId": "67542"
        },
        {
          "cardId": "67549"
        },
        {
          "cardId": "67550"
        },
        {
          "cardId": "67552"
        },
        {
          "cardId": "67553"
        },
        {
          "cardId": "67557"
        },
        {
          "cardId": "67567"
        },
        {
          "cardId": "67584"
        },
        {
          "cardId": "67598"
        },
        {
          "cardId": "67600"
        },
        {
          "cardId": "67601"
        },
        {
          "cardId": "67605"
        },
        {
          "cardId": "67606"
        },
        {
          "cardId": "67610"
        },
        {
          "cardId": "67627"
        },
        {
          "cardId": "67629"
        },
        {
          "cardId": "67666"
        },
        {
          "cardId": "67670"
        },
        {
          "cardId": "67675"
        },
        {
          "cardId": "67677"
        },
        {
          "cardId": "67681"
        },
        {
          "cardId": "67682"
        },
        {
          "cardId": "67704"
        },
        {
          "cardId": "67705"
        },
        {
          "cardId": "67717"
        },
        {
          "cardId": "67718"
        },
        {
          "cardId": "67720"
        },
        {
          "cardId": "67722"
        },
        {
          "cardId": "67728"
        },
        {
          "cardId": "67739"
        },
        {
          "cardId": "67744"
        },
        {
          "cardId": "67746"
        },
        {
          "cardId": "67749"
        },
        {
          "cardId": "67750"
        },
        {
          "cardId": "67771"
        },
        {
          "cardId": "67772"
        },
        {
          "cardId": "67775"
        },
        {
          "cardId": "67780"
        },
        {
          "cardId": "67784"
        },
        {
          "cardId": "67799"
        },
        {
          "cardId": "67811"
        },
        {
          "cardId": "67813"
        },
        {
          "cardId": "67833"
        },
        {
          "cardId": "67860"
        },
        {
          "cardId": "67892"
        },
        {
          "cardId": "67894"
        },
        {
          "cardId": "67907"
        },
        {
          "cardId": "67916"
        },
        {
          "cardId": "67920"
        },
        {
          "cardId": "67921"
        },
        {
          "cardId": "67938"
        },
        {
          "cardId": "67971"
        },
        {
          "cardId": "67972"
        },
        {
          "cardId": "67974"
        },
        {
          "cardId": "67975"
        },
        {
          "cardId": "67976"
        },
        {
          "cardId": "67977"
        },
        {
          "cardId": "67983"
        },
        {
          "cardId": "67987"
        },
        {
          "cardId": "68035"
        },
        {
          "cardId": "68063"
        },
        {
          "cardId": "68065"
        },
        {
          "cardId": "68071"
        },
        {
          "cardId": "68081"
        },
        {
          "cardId": "68082"
        },
        {
          "cardId": "68096"
        },
        {
          "cardId": "68108"
        },
        {
          "cardId": "68117"
        },
        {
          "cardId": "68122"
        },
        {
          "cardId": "68133"
        },
        {
          "cardId": "68141"
        },
        {
          "cardId": "68143"
        },
        {
          "cardId": "68148"
        },
        {
          "cardId": "68175"
        },
        {
          "cardId": "68183"
        },
        {
          "cardId": "68258"
        },
        {
          "cardId": "68308"
        },
        {
          "cardId": "68316"
        },
        {
          "cardId": "68317"
        },
        {
          "cardId": "68318"
        },
        {
          "cardId": "68319"
        },
        {
          "cardId": "68320"
        },
        {
          "cardId": "68322"
        },
        {
          "cardId": "68323"
        },
        {
          "cardId": "68324"
        },
        {
          "cardId": "68325"
        },
        {
          "cardId": "68329"
        },
        {
          "cardId": "68331"
        },
        {
          "cardId": "68332"
        },
        {
          "cardId": "68333"
        },
        {
          "cardId": "68336"
        },
        {
          "cardId": "68337"
        },
        {
          "cardId": "68338"
        },
        {
          "cardId": "68344"
        },
        {
          "cardId": "68346"
        },
        {
          "cardId": "68347"
        },
        {
          "cardId": "68348"
        },
        {
          "cardId": "68364"
        },
        {
          "cardId": "68415"
        },
        {
          "cardId": "68418"
        },
        {
          "cardId": "68428"
        },
        {
          "cardId": "68429"
        },
        {
          "cardId": "68430"
        },
        {
          "cardId": "68431"
        },
        {
          "cardId": "68435"
        },
        {
          "cardId": "68441"
        },
        {
          "cardId": "68444"
        },
        {
          "cardId": "68457"
        },
        {
          "cardId": "68460"
        },
        {
          "cardId": "68464"
        },
        {
          "cardId": "68467"
        },
        {
          "cardId": "68469"
        },
        {
          "cardId": "68471"
        },
        {
          "cardId": "68481"
        },
        {
          "cardId": "68486"
        },
        {
          "cardId": "68487"
        },
        {
          "cardId": "68488"
        },
        {
          "cardId": "68551"
        },
        {
          "cardId": "68554"
        },
        {
          "cardId": "68580"
        },
        {
          "cardId": "68585"
        },
        {
          "cardId": "68608"
        },
        {
          "cardId": "68630"
        },
        {
          "cardId": "68631"
        },
        {
          "cardId": "68640"
        },
        {
          "cardId": "68641"
        },
        {
          "cardId": "68659"
        },
        {
          "cardId": "68660"
        },
        {
          "cardId": "68661"
        },
        {
          "cardId": "68663"
        },
        {
          "cardId": "68664"
        },
        {
          "cardId": "68665"
        },
        {
          "cardId": "68666"
        },
        {
          "cardId": "68667"
        },
        {
          "cardId": "68670"
        },
        {
          "cardId": "68673"
        },
        {
          "cardId": "68675"
        },
        {
          "cardId": "68676"
        },
        {
          "cardId": "68677"
        },
        {
          "cardId": "68678"
        },
        {
          "cardId": "68679"
        },
        {
          "cardId": "68680"
        },
        {
          "cardId": "68681"
        },
        {
          "cardId": "68683"
        },
        {
          "cardId": "68685"
        },
        {
          "cardId": "68686"
        },
        {
          "cardId": "68687"
        },
        {
          "cardId": "68688"
        },
        {
          "cardId": "68689"
        },
        {
          "cardId": "68692"
        },
        {
          "cardId": "68694"
        },
        {
          "cardId": "68695"
        },
        {
          "cardId": "68699"
        },
        {
          "cardId": "68702"
        },
        {
          "cardId": "68703"
        },
        {
          "cardId": "68705"
        },
        {
          "cardId": "68706"
        },
        {
          "cardId": "69534"
        },
        {
          "cardId": "69542"
        },
        {
          "cardId": "69554"
        },
        {
          "cardId": "69570"
        },
        {
          "cardId": "69577"
        },
        {
          "cardId": "69586"
        },
        {
          "cardId": "69631"
        },
        {
          "cardId": "69632"
        },
        {
          "cardId": "69638"
        },
        {
          "cardId": "70009"
        },
        {
          "cardId": "70537"
        },
        {
          "cardId": "70539"
        },
        {
          "cardId": "70542"
        },
        {
          "cardId": "70550"
        },
        {
          "cardId": "70551"
        },
        {
          "cardId": "70554"
        },
        {
          "cardId": "70555"
        },
        {
          "cardId": "70556"
        },
        {
          "cardId": "70561"
        },
        {
          "cardId": "70562"
        },
        {
          "cardId": "70575"
        },
        {
          "cardId": "70576"
        },
        {
          "cardId": "70581"
        },
        {
          "cardId": "70583"
        },
        {
          "cardId": "70584"
        },
        {
          "cardId": "70585"
        },
        {
          "cardId": "70586"
        },
        {
          "cardId": "70587"
        },
        {
          "cardId": "70588"
        },
        {
          "cardId": "70593"
        },
        {
          "cardId": "70605"
        },
        {
          "cardId": "70613"
        },
        {
          "cardId": "70621"
        },
        {
          "cardId": "70622"
        },
        {
          "cardId": "70623"
        },
        {
          "cardId": "70628"
        },
        {
          "cardId": "70635"
        },
        {
          "cardId": "70648"
        },
        {
          "cardId": "70652"
        },
        {
          "cardId": "70654"
        },
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
          "cardId": "70730"
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
          "cardId": "71282"
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