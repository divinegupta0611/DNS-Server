const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const dgram = require('node:dgram');
const dnsPacket = require('dns-packet')

const server = dgram.createSocket('udp4');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create a connection to the database
let db;
async function connectToDatabase() {
    try {
      db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'BU@#8826613045',
        database: 'dns_server',
      });
      console.log('Connected to the MySQL database.');
    } catch (err) {
      console.error('Error connecting to the database:', err.message);
    }
  }
connectToDatabase();
const db2 = {
    'piyushgarg.dev' : {
        type:'A',
        data:'1.2.3.4'
    },
    'blog.piyushgarg.dev': {
        type:'CNAME',
        data:'hashnode.network'
    }
};

server.on('message', async(msg, rinfo) => {
    const incomingReq = dnsPacket.decode(msg);
    const ipFromDb = db2[incomingReq.questions[0].name];
    let rows;
    let name1;
    let type1;
    let data1;
    async function func1(){
        try {
            const sql = 'SELECT * FROM dns_records';
            [rows] = await db.execute(sql);
            // Extract hostnames
            const hostnames = rows.map(row => row.hostname);
            // Extract type
            const type = rows.map(row=>row.type);
            // Extract data
            const data = rows.map(row=>row.data);
            console.log('Data from database:', rows);
            for(let i=0;i<hostnames.length;i++){
                if(hostnames[i]==incomingReq.questions[0].name){ 
                    name1 = incomingReq.questions[0].name;
                    type1 = type[i];
                    data1 = data[i];
                }
            }
          } catch (err) {
            console.error('Error fetching data:', err.message);
          }
    }
    await func1();
    const ans = dnsPacket.encode({
        type: 'response',
        id: incomingReq.id,
        flags: dnsPacket.AUTHORITATIVE_ANSWER,
        questions: incomingReq.questions,
        answers: [{
            type:type1,
            class:'IN',
            name: incomingReq.questions[0].name,
            data: data1
        }]
    });
    console.log(incomingReq.questions);
    console.log(rinfo);
    server.send(ans,rinfo.port,rinfo.address)
  });

server.bind(53,() => console.log("Server is listening on port 53"));

app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname, '/public/HTML/home.html'));
})
app.post('/submit',(req,res)=>{
    const {hostname,type,data} = req.body;
    console.log(hostname);
    console.log(type);
    console.log(data);
    const sql = 'INSERT INTO dns_records(hostname,type,data) VALUES (?, ?, ?)';
    db.query(sql, [hostname, type, data], (err, result) => {
      if (err) {
        console.error('Error inserting data:', err.message);
      }
      else console.log('Data inserted');
    });
    res.redirect('/');
})
app.listen(3000,()=>{
    console.log(`Server is running of port 3000`);
})