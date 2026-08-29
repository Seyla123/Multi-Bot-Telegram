const fetch = require('node-fetch') || fetch;
async function test() {
  const res = await fetch("http://localhost:3000/api/admin/agents?sortBy=name&sortOrder=asc", {
    headers: { "Authorization": "Bearer fake" } // wait, this will fail 401
  });
  console.log(res.status);
}
test();
