import { spawn } from 'child_process';

export const execCommanad = async(cmd: string) => {
  return new Promise((resolve, reject)=>{
    const child = spawn("/bin/sh", ["-c", cmd] );
    let output = ""
    child.on('close', (code) => {
      console.log('>> closing code: ' + code);
      if( code == 0 ) resolve(output)
      else reject(output)
    });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      process.stdout.write('>> stdout: ' + data);
      output += data.toString()
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
      process.stdout.write('>> stdout: ' + data);
      output += data.toString()
    });
  })
}
