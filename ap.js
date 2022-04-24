const fs = require('fs');

const data = fs.readFileSync(`text.txt`, {encoding: "utf8"})

const dataSplit = data.split('\n')

let id = 1;

for(d of dataSplit){
    const tst = d.split('(ETB):')
    const a =  '"'+tst[0].concat(' (ETB)')+ '"'
    const b = '"'+ tst[1]+ '"'
    // console.log(tst[1])
    fs.writeFileSync(`t.txt`, "\n" +
    "{" 
    + 'book' + ':' + a + ","
     + 'id'+ ':'  + id + ","
     + 'verse'+ ':'  + b 
     + "},"
     ,{
        encoding: "utf8",
        flag: "a+",
        mode: 0o666
    }
    )
    id+=1

}

