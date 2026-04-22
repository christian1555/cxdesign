$('.owl-carousel').owlCarousel({
    stagePadding: 0,
    loop:true,
    margin:20,
    nav:false,
    dots: true,
    dotsEach: 1,
    responsive:{
        0:{
            items:1
        },
        480:{
            items:2
        },
        750:{
            items:3
        },
        1000:{
            items:4
        }
    }

})