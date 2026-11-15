// Local-only development fixture. Never sends an actual job application.
import http from 'node:http';
const form=`<!doctype html><html><head><title>Demo Careers Form</title></head><body><h1>Demo Internship Application</h1><form action="/thank-you" method="post" enctype="multipart/form-data">
<label>First Name <input type="text" name="first_name" required></label><br>
<label>Last Name <input type="text" name="last_name" required></label><br>
<label>Email Address <input type="email" name="email" required></label><br>
<label>Phone Number <input type="tel" name="phone" required></label><br>
<label>Resume <input type="file" name="resume" accept=".pdf" required></label><br>
<button type="submit">Submit Application</button></form></body></html>`;
const server=http.createServer((req,res)=>{
  if(req.method==='POST'&&req.url==='/thank-you'){
    req.resume();req.on('end',()=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Thank you for your application</h1>');});return;
  }
  if(req.url==='/') {res.writeHead(200,{'Content-Type':'text/html'});res.end(form);return;}
  res.writeHead(404);res.end('Not found');
});
server.listen(4242,'127.0.0.1',()=>console.log('Demo application form at http://127.0.0.1:4242'));
