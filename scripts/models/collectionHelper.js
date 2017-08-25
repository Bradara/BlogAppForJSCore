let dataService = (() => {

    const commonTemplate = {
        header: 'templates/common/header.hbs',
        footer: "templates/common/footer.hbs",
        home: "templates/home/home.hbs"
    };

    function getPosts() {
        return requester.get('appdata', 'posts', 'kinvey');
    }

    function getMyPosts() {
        let author = sessionStorage.getItem('username');
        return requester.get('appdata', `posts?query={"author":"${author}"}`, 'kinvey');
    }

    function getComments(postId) {
        return requester.get('appdata', `comments?query={"postId":"${postId}"}&sort={"_kmd.ect": -1}`, 'kinvey');
    }

    function getPost(postId) {
        return requester.get('appdata', 'posts/' + postId, 'kinvey');
    }

    function calcTime(dateIsoFormat) {
        let diff = new Date - (new Date(dateIsoFormat));
        diff = Math.floor(diff / 60000);
        if (diff < 1) return 'less than a minute';
        if (diff < 60) return diff + ' minute' + pluralize(diff);
        diff = Math.floor(diff / 60);
        if (diff < 24) return diff + ' hour' + pluralize(diff);
        diff = Math.floor(diff / 24);
        if (diff < 30) return diff + ' day' + pluralize(diff);
        diff = Math.floor(diff / 30);
        if (diff < 12) return diff + ' month' + pluralize(diff);
        diff = Math.floor(diff / 12);
        return diff + ' year' + pluralize(diff);

        function pluralize(value) {
            if (value !== 1) return 's';
            else return '';
        }
    }

    function displayCatalog(ctx) {
        ctx.hasUser = sessionStorage.getItem('username') !== null;
        ctx.username = sessionStorage.getItem('username');
        commonTemplate.article = "templates/catalog/postArticle.hbs";
        dataService.getPosts().then(function (postData) {
            for (let p of postData) {
                p['dayBefore'] = calcTime(p._kmd.ect);
                p["isAuthor"] = sessionStorage.getItem("username") === p.author;
            }
            ctx.articles = postData;
            ctx.loadPartials(commonTemplate).then(function () {
                this.partial("templates/catalog/postPage.hbs")
            })
        }).catch(auth.handleError);
    }

    function sendLink(url, title, image, comment) {
        let data = {
            url,
            title,
            imageUrl: image,
            description: comment,
            author: sessionStorage.getItem('username')
        };
        return requester.post('appdata', "posts", "kinvey", data);
    }

    function editLink(url, title, image, comment, postId) {
        let data = {
            url,
            title,
            imageUrl: image,
            description: comment,
            author: sessionStorage.getItem('username')
        };
        return requester.update("appdata", 'posts/' + postId, 'kinvey', data);
    }


    return {
        getPosts,
        getPost,
        displayCatalog,
        sendLink,
        editLink,
        getComments,
        calcTime,
        getMyPosts
    }
})();