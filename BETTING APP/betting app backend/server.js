const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ------------------ MySQL Connection ------------------
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // weka password yako ya MySQL
  database: 'betpro'
});

db.connect(err => {
  if(err) console.log(err);
  else console.log('MySQL connected');
});

// ------------------ USER REGISTER ------------------
app.post('/register', async (req,res)=>{
  const {phone,password} = req.body;
  if(!phone || !password) return res.status(400).json({msg:'Enter phone & password'});
  const hash = await bcrypt.hash(password,10);
  db.query('INSERT INTO users (phone,password) VALUES (?,?)',[phone,hash],(err,result)=>{
    if(err) return res.status(500).json({msg:'Phone already exists'});
    res.json({msg:'User registered', userId: result.insertId});
  });
});

// ------------------ USER LOGIN ------------------
app.post('/login', (req,res)=>{
  const {phone,password} = req.body;
  db.query('SELECT * FROM users WHERE phone=?',[phone], async (err,result)=>{
    if(err) return res.status(500).json({msg:'DB Error'});
    if(result.length===0) return res.status(400).json({msg:'User not found'});
    const valid = await bcrypt.compare(password,result[0].password);
    if(!valid) return res.status(400).json({msg:'Wrong password'});
    res.json({msg:'Login success', userId: result[0].id, balance: result[0].balance});
  });
});

// ------------------ GET PREMATCH ------------------
app.get('/matches', (req,res)=>{
  db.query('SELECT * FROM matches WHERE type="prematch"',(err,result)=>{
    if(err) return res.status(500).json({msg:'DB Error'});
    res.json(result);
  });
});

// ------------------ GET LIVE MATCHES ------------------
app.get('/live',(req,res)=>{
  db.query('SELECT * FROM matches WHERE type="live"',(err,result)=>{
    if(err) return res.status(500).json({msg:'DB Error'});
    res.json(result);
  });
});

// ------------------ DEPOSIT ------------------
app.post('/deposit',(req,res)=>{
  const {userId, amount} = req.body;
  if(amount<=0) return res.status(400).json({msg:'Invalid amount'});
  db.query('UPDATE users SET balance = balance + ? WHERE id=?',[amount,userId],(err,result)=>{
    if(err) return res.status(500).json({msg:'DB Error'});
    res.json({msg:'Deposit successful'});
  });
});

// ------------------ PLACE BET ------------------
app.post('/bet',(req,res)=>{
  const {userId, amount} = req.body;
  if(amount<=0) return res.status(400).json({msg:'Invalid amount'});
  db.query('SELECT balance FROM users WHERE id=?',[userId],(err,result)=>{
    if(err) return res.status(500).json({msg:'DB Error'});
    if(result.length===0) return res.status(400).json({msg:'User not found'});
    if(result[0].balance < amount) return res.status(400).json({msg:'Insufficient balance'});
    db.query('UPDATE users SET balance = balance - ? WHERE id=?',[amount,userId],(err2,result2)=>{
      if(err2) return res.status(500).json({msg:'DB Error'});
      res.json({msg:'Bet placed'});
    });
  });
});

app.listen(3000,()=>console.log('Server running on http://localhost:3000'));