import fs from 'node:fs'

let c = fs.readFileSync('project.md', 'utf8')
c = c.replace(/^import\s+[\s\S]*?from\s+["'].*?["\'];?/gm, '').replace(/\n\s*\n/g, '\n')
fs.writeFileSync('project.md', c)
console.log('Success!!')
