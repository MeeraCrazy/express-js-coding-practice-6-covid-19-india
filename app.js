const express = require('express')
const app = express()

const {open} = require('sqlite')
const path = require('path')
const sqlite3 = require('sqlite3')

const dbPath = path.join(__dirname, 'covid19India.db')

app.use(express.json())

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Success')
    })
  } catch (e) {
    console.log(`DB ERROR ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const converStateTableIntoResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const convertDirectorTableIntoResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

//API :1 GET STATES

app.get('/states', async (request, response) => {
  const getStatesQuery = `
    SELECT 
    *
    FROM
    state
    ORDER BY
    state_id;
    `

  const stateList = await db.all(getStatesQuery)
  response.send(
    stateList.map(eachState => converStateTableIntoResponseObject(eachState)),
  )
})

//API :2 GET STATE BASED ON ID

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
  SELECT
  *
  FROM
  state
  WHERE
  state_id = ${stateId};
  `
  const stateBasedOnId = await db.get(getStateQuery)
  response.send(converStateTableIntoResponseObject(stateBasedOnId))
})

//API :3 ADD DISTRICT

app.post('/districts/', async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const addDistrictQuery = `
  INSERT INTO

  district (district_name, state_id,cases,cured,active,deaths)
  
  VALUES

  (
  "${districtName}",
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths}
);
  `
  await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

//API 4: GET DISTRICT BASED ON ID

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params

  const getDistrictQuery = `
  SELECT 
  *
  FROM

  district

  WHERE

  district_id = ${districtId};
  `

  const districtBasedOnId = await db.get(getDistrictQuery)
  response.send(convertDirectorTableIntoResponseObject(districtBasedOnId))
})

//API 5: DELETE DISTRICT BASED ON ID

app.delete('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params

  const deleteDistrictQuery = `
  DELETE 
  FROM
  district
  WHERE
  district_id = ${districtId};

  `
  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

//API GET UPDATE DISTRICT

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const updateDistrictQuery = `
  UPDATE 

  district

  SET

    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}

  WHERE
   district_id = ${districtId};
  
  `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

//API 6: GET TOTAL CASES

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getDistrictStatsQuery = `
  SELECT 
    SUM(cases), 
    SUM(cured), 
    SUM(active),
    SUM(deaths)

  FROM

    district

  WHERE
    state_id = ${stateId};
  `
  const stats = await db.get(getDistrictStatsQuery)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

//API GET STATE NAME BASED ON DISTRICT ID

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params

  const getDistrictIdQuery = `
  
  SELECT

    state_id

  FROM

    district

  WHERE 
    district_id = ${districtId};
  `

  const getDistrictIdFromDistrictTable = await db.get(getDistrictIdQuery)

  const getStateIdQuery = `
  
  SELECT
    state_name as stateName

  FROM
    state

  WHERE
     
    state_id = ${getDistrictIdFromDistrictTable.state_id};
  `

  const getStateNameQueryResponse = await db.get(getStateIdQuery)
  response.send(getStateNameQueryResponse)
})

module.exports = app
