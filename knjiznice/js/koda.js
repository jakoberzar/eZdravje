
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var primeri = [
  {
    ime: 'John',
    priimek: 'Smith',
    datumRojstva: '1990-08-20T11:30',
    naslov: { address: 'United States of America' },
    meritve: [
      { teza: 70, visina: '170' },
      { teza: 72, visina: '170' },
      { teza: 90, visina: '173' }
    ]
  },
  {
    ime: 'Vebastian',
    priimek: 'Settel',
    datumRojstva: '1987-07-03T00:30',
    naslov: { address: 'Germany' },
    meritve: [
      { teza: 58, visina: '175' },
      { teza: 56, visina: '176' },
      { teza: 59, visina: '176' }
    ]
  },
  {
    ime: 'Mina',
    priimek: 'Taze',
    datumRojstva: '1983-05-02T02:15',
    naslov: { address: 'Slovenia' },
    meritve: [
      { teza: 65, visina: '171' },
      { teza: 70, visina: '171' },
      { teza: 68, visina: '171' }
    ]
  } 
];

var ehrPrimeri = ['624826a3-b0b6-4e49-9c98-682b9cf126ae', 'e12f9045-fcdf-48ca-a850-164b684b2e3b', 'c178e2ab-812c-475b-9d83-6fa43360c829'];

/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta, callback) {
  var ehrId = "";

  // TODO: Potrebno implementirati
  sessionId = getSessionId();
  stPacienta--;
 
  var pacient = primeri[stPacienta];
  
  $.ajaxSetup({
    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
    url: baseUrl + "/ehr",
    type: 'POST',
    success: function (data) {
      ehrId = data.ehrId;
      var partyData = {
        firstNames: pacient.ime,
        lastNames: pacient.priimek,
        dateOfBirth: pacient.datumRojstva,
        address: pacient.naslov,
        partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
      };
      $.ajax({
        url: baseUrl + "/demographics/party",
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(partyData),
        success: function (party) {
          if (party.action == 'CREATE') {
              console.log('Uspesno kreiran ' + ehrId);
              callback(stPacienta, ehrId);
          }
          
          // Dodaj meritve
          for (var i = 0; i < pacient.meritve.length; i++) {
        		var podatki = {
        			// Struktura predloge je na voljo na naslednjem spletnem naslovu:
              // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
        		    "ctx/language": "en",
        		    "ctx/territory": "SI",
        		    "ctx/time": new Date().toISOString(),
        		    "vital_signs/height_length/any_event/body_height_length": pacient.meritve[i].visina,
        		    "vital_signs/body_weight/any_event/body_weight": pacient.meritve[i].teza
        		};
        		var parametriZahteve = {
        		    ehrId: ehrId,
        		    templateId: 'Vital Signs'
        		};
        		$.ajax({
        		    url: baseUrl + "/composition?" + $.param(parametriZahteve),
        		    type: 'POST',
        		    contentType: 'application/json',
        		    data: JSON.stringify(podatki),
        		    success: function (res) {
      		        console.log('Dodana meritev, ', res, res.meta.href);
        		    },
        		    error: function(err) {
      		        console.log('Ni dodana meritev!', err);
        		    }
        		});
          }
        },
        error: function(err) {
          console.log('Napaka!');
          console.log(err);
        }
      });
    }
	});
}


// TODO: Tukaj implementirate funkcionalnost, ki jo podpira vaša aplikacija
/* global country_labels, countries, $, Chart */
var JSONProxy = 'https://jsonp.afeld.me/?url=';
var sessionId;

function spremeniEhrPrimer(stevilka, nov) {
  ehrPrimeri[stevilka] = nov;
  console.log('Primer ' + stevilka, nov);
}

function generirajPodatkeCall() {
  for (var i = 1; i < 4; i++) {
    generirajPodatke(i, spremeniEhrPrimer);
  }
}

function pridobiPodatke(ehrId, callback) {
  sessionId = getSessionId();

	if (!ehrId || ehrId.trim().length == 0) {
				console.error('ehrId ni podan!');
	} else {
		$.ajax({
			url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
			type: 'GET',
			headers: {"Ehr-Session": sessionId},
	    	success: function (data) {
				var party = data.party;
				console.log('Party data', data);
				callback(getCountryLabel(party.address.address));
			},
			error: function(err) {
				console.error('Napaka', err);
			}
		});
	}
}

function getCountryLabel(country) {
  for(var i = 0; i < country_labels.length; i++) {
    if (country_labels[i].display == country) return country_labels[i].label;
  }
  console.error('Couldn\'t find the country!');
  return '';
}

function pridobiStatistiko(country_label) {
  var requestURL = 'http://apps.who.int/gho/athena/data/GHO/WHOSIS_000001,WHOSIS_000002.json?profile=simple&filter=COUNTRY:' + country_label +';YEAR:2015';
  $.getJSON(JSONProxy + encodeURIComponent(requestURL), function(data){
    console.log('stats', data.fact);
    countryData[0] = 0;
    for (var i = 0; i < data.fact.length; i++) {
      var t = data.fact[i];
      if (t.dim.GHO == "Life expectancy at birth (years)") {
        if (t.dim.SEX == "Both sexes") {
          countryData[3] = t.Value;
        } else if (t.dim.SEX == "Male") {
          countryData[1] = t.Value;
        } else if (t.dim.SEX == "Female") {
          countryData[2] = t.Value;
        }
      }
    }
  });
}

function ehrIzPrimera(stevilka) {
  $('#ehrInput').val(ehrPrimeri[stevilka]);
}


pridobiPodatke('2cbf35e7-6a16-45e6-b591-3a6fa25aced8', pridobiStatistiko);
var myChart;
var countryData = [];
$(document).ready(function() {
  var ctx = document.getElementById("myChart");
  myChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: ["Izbran pacient", "Moški", "Ženske", "Oba spola", "Zdravo življenje"],
          datasets: [{
              label: 'Življenska doba (let)',
              data: [12, 19, 3, 5, 2, 3],
              backgroundColor: [
                  'rgba(255, 99, 132, 0.2)',
                  'rgba(54, 162, 235, 0.2)',
                  'rgba(255, 206, 86, 0.2)',
                  'rgba(75, 192, 192, 0.2)',
                  'rgba(153, 102, 255, 0.2)',
                  'rgba(255, 159, 64, 0.2)'
              ],
              borderColor: [
                  'rgba(255,99,132,1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                  'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              yAxes: [{
                  ticks: {
                      beginAtZero:true
                  }
              }]
          }
      }
  });
});