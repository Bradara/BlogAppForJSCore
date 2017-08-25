$(() => {

    Handlebars.registerHelper("counter", function (index) {
        return index + 1;
    });

    const commonTemplate = {
        header: 'templates/common/header.hbs',
        footer: "templates/common/footer.hbs",
        home: "templates/home/home.hbs"
    };

    const app = Sammy('#container', function () {

        this.use('Handlebars', 'hbs');

        $(document).on({
            ajaxStart: function () {
                $("#loadingBox").show();
            },
            ajaxStop: function () {
                $("#loadingBox").hide();
            }
        });

        // HOME
        this.get('index.html', displayHome);
        this.get('#/home', displayHome);

        //Login, register and logout logic.
        this.post('#/login', function (ctx) {
            ctx.loadPartials(commonTemplate).then(function () {
                let username = ctx.params.username;
                let pass = ctx.params.password;
                auth.login(username, pass).then(function (userInfo) {
                    auth.saveSession(userInfo);
                    auth.showInfo("Logged in!");
                    ctx.redirect('#/catalog');
                }).catch(auth.handleError)
            })
        });
        this.post('#/register', function (ctx) {
            let username = ctx.params.username;
            let password = ctx.params.password;
            let repeatpass = ctx.params.repeatPass;
            if (!username.match(/^[a-zA-Z]{3,}$/)) {
                auth.showError('Username must be at least 3 characters long and should contain only english alphabet letters.');
                return;
            }
            if (!password.match(/^\w{6,}$/)) {
                auth.showError('Password should be at least 6 characters long and should contain only english alphabet letters and digits.');
                return;
            }
            if (password !== repeatpass) {
                auth.showError('Passwords do not match.');
                return;
            }

            auth.register(username, password).then(function (userInfo) {
                auth.showInfo("Your registered successfully!");
                auth.saveSession(userInfo);
                ctx.redirect('#/catalog');
            }).catch(auth.handleError);
        });
        this.get('#/logout', function (ctx) {
            auth.logout().then(function () {
                sessionStorage.clear();
                auth.showInfo("Logged out!");
                ctx.redirect('#/home');
            }).catch(auth.handleError)
        });

        //Post logic.
        this.get('#/catalog', dataService.displayCatalog);
        this.get('#/submitLink', function (ctx) {
            ctx.hasUser = sessionStorage.getItem('username') !== null;
            ctx.username = sessionStorage.getItem('username');
            commonTemplate.linkForm = 'templates/submitLink/submitLink.hbs';
            ctx.loadPartials(commonTemplate).then(function () {
                this.partial('templates/submitLink/submitPage.hbs')
            })
        });
        this.post('#/submitLink', function (ctx) {
            let {url, title, image, comment} = ctx.params;
            dataService.sendLink(url, title, image, comment).then(function () {
                auth.showInfo('Post created.');
                ctx.redirect('#/catalog')
            }).catch(auth.handleError)
        });
        this.get('#/edit/:id', function (ctx) {
            let postId = ctx.params.id.substr(1);
            dataService.getPost(postId).then(function (postInfo) {
                    ctx.description = postInfo.description;
                    ctx.url = postInfo.url;
                    ctx.id = postInfo._id;
                    ctx.imageUrl = postInfo.imageUrl;
                    ctx.title = postInfo.title;
                    ctx.hasUser = sessionStorage.getItem('username') !== null;
                    ctx.username = sessionStorage.getItem('username');
                    commonTemplate.editForm = 'templates/editLink/editLink.hbs';
                    ctx.loadPartials(commonTemplate).then(function () {
                        this.partial('templates/editLink/editPage.hbs')
                    })
                }
            ).catch(auth.handleError)
        });
        this.post('#/edit/:id', function (ctx) {
            let postId = ctx.params.id.substr(1);
            let {url, title, image, comment} = ctx.params;
            dataService.editLink(url, title, image, comment, postId).then(function () {
                console.log(this);
                auth.showInfo(`Post ${this.title} edited.`);
                ctx.redirect('#/catalog')
            }).catch(auth.handleError)
        });
        this.get('#/comments/:id', function (ctx) {
            let postId = ctx.params.id.substr(1);
            dataService.getPost(postId).then(function (postInfo) {
                    ctx.description = postInfo.description;
                    ctx.url = postInfo.url;
                    ctx.id = postInfo._id;
                    ctx.imageUrl = postInfo.imageUrl;
                    ctx.title = postInfo.title;
                    ctx.author = postInfo.author;
                    ctx.hasUser = sessionStorage.getItem('username') !== null;
                    ctx.username = sessionStorage.getItem('username');
                    ctx.dayBefore = dataService.calcTime(postInfo._kmd.ect);
                    ctx.isAuthor = sessionStorage.getItem("username") === postInfo.author;
                    commonTemplate.postForm = "templates/comments/postForm.hbs";
                    commonTemplate.comment = "templates/comments/commentsForm.hbs";
                    dataService.getComments(postId).then(function (comments) {
                        for (let c of comments) {
                            c.dayBefore = dataService.calcTime(c._kmd.ect);
                            c.isAuthor = sessionStorage.getItem("username") === c.author;
                        }
                        ctx.comments = comments;

                        ctx.loadPartials(commonTemplate).then(function () {
                            this.partial('templates/comments/commentsPage.hbs');
                        })
                    })

                }
            ).catch(auth.handleError)
        });
        this.get('#/myPosts', function (ctx) {
            ctx.hasUser = sessionStorage.getItem('username') !== null;
            ctx.username = sessionStorage.getItem('username');
            dataService.getMyPosts().then(function (posts) {
                for (let p of posts) {
                    p['dayBefore'] = dataService.calcTime(p._kmd.ect);
                }
                ctx.posts = posts;
                commonTemplate.post = 'templates/myPosts/myPostForm.hbs';
                ctx.loadPartials(commonTemplate).then(function () {
                    this.partial('templates/myPosts/myPostPage.hbs')
                })
            }).catch(auth.handleError)
        });

        this.get('#/delete/:id', function (ctx) {
            let postId = ctx.params.id.substr(1);
            requester.remove('appdata', 'posts/' + postId, 'kinvey').then(function () {
                auth.showInfo('Post deleted.');
                ctx.redirect('#/catalog');
            }).catch(auth.handleError)
        });

        this.post('#/addComment:id', function (ctx) {
            let data = {
                author: sessionStorage.getItem('username'),
                content: ctx.params.content,
                postId: ctx.params.id.substr(1)
            };
            requester.post('appdata', 'comments', "kinvey", data).then(function (commentInfo) {
                ctx.redirect('#/comments/:' + ctx.params.id.substr(1));
            })
        });
        this.get('#/deleteCom/:id', function (ctx) {
            let commentId = ctx.params.id.substr(1);
            let postId = $('a[data]').attr('data');
            requester.remove('appdata', 'comments/' + commentId, 'kinvey').then(function () {
                auth.showInfo('Comment deleted.');
                ctx.redirect(`#/comments/:${postId}`);
            }).catch(auth.handleError)
        })

    });

    app.run();

    function displayHome(ctx) {
        ctx.hasUser = sessionStorage.getItem('username') !== null;
        ctx.username = sessionStorage.getItem('username');
        ctx.loadPartials(commonTemplate).then(function () {
            this.partial("templates/home/homePage.hbs")
        })
    }


});