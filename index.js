const cheerio = require("cheerio")
const fetch = require("node-fetch")
const fs = require("fs")
const path = require("path")
const readline = require("readline")
const url = require("url")

var output = path.join(__dirname, "download")

var io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

if (!fs.existsSync(output)) {
    fs.mkdirSync(output)
}

function downloadPost(postId, src) {
    return new Promise((resolve) => {
        let stream = fs.createWriteStream(path.join(output, path.basename(url.parse(src).pathname)))
        
        fetch(src).then((response) => new Promise((_resolve, _reject) => {
            response.body.pipe(stream)
            stream.on("close", () => _resolve());
            stream.on("error", _reject)
        }))
    })
}

async function downloadPosts(posts) {
    let postUrl = "https://gelbooru.com/index.php?page=post&s=view"
    for (let i = 0; i < posts.length; i++) {
        let response = await fetch(`${postUrl}&id=${posts[i]}`)
        let body = await response.text()
        let src = ""
        
        let trimmed = body.substring(body.indexOf("image.attr('src','") + "image.attr('src','".length)
        src = trimmed.split("'")[0]
        
        downloadPost(posts[i], src)
    }
}

(async () => {
    var id = await new Promise(resolve => { io.question("Gelbooru user ID: ", resolve) })

    console.log(`Downloading to "${output}"`)

    let favoritesUrl = `https://gelbooru.com/index.php?page=post&s=list&tags=fav%3a${id}`
    let lastPostId = 0

    // get lastPostId
    let response = await fetch(favoritesUrl)
    let body = await response.text()
    let $ = cheerio.load(body)

    let href = $("[alt='last page']").attr("href")
    lastPostId = href.substring(href.lastIndexOf("=") + 1)

    for (let postId = 0; postId <= lastPostId; postId += 42) {
        let response = await fetch(`${favoritesUrl}&pid=${postId}`)
        let body = await response.text()
        
        $ = cheerio.load(body)
        
        let list = $(".thumbnail-preview a")
        let posts = []
        
        for (let i = 0; i < list.length; i++) { 
            let id = $(list[i]).attr("id")
            posts.push(id.replace("p", ""))
        }
        
        downloadPosts(posts)
    }
})()