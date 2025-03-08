
function redirectTo(page) {
    window.location.href = page;
}
document.addEventListener("DOMContentLoaded", async () => {
    const carouselInner = document.getElementById("carouselInner");
    const prevButton = document.getElementById("prevButton");
    const nextButton = document.getElementById("nextButton");

    let currentIndex = 0;
    let movies = [];

    try {
        const response = await fetch("http://localhost:5000/api/movies");
        movies = await response.json(); 
        console.log("Filmes carregados:", movies); 
    } catch (error) {
        console.error("Erro ao carregar filmes:", error);
        return;
    }

    function renderCarousel() {
        carouselInner.innerHTML = ""; 
        for (let i = 0; i < 4; i++) { 
            const index = (currentIndex + i) % movies.length;
            const movie = movies[index];
    
            if (!movie || !movie.poster) continue; 
    
            const movieCard = document.createElement("div");
            movieCard.classList.add("movie-card");
            movieCard.style.backgroundImage = `url('${movie.poster}')`;
    
            console.log(`Adicionando pôster: ${movie.poster}`); 
    
            carouselInner.appendChild(movieCard);
        }
    }

    prevButton.addEventListener("click", () => {
        currentIndex = (currentIndex - 1 + movies.length) % movies.length;
        renderCarousel();
    });

    nextButton.addEventListener("click", () => {
        currentIndex = (currentIndex + 1) % movies.length;
        renderCarousel();
    });

    renderCarousel();
});


document.addEventListener("DOMContentLoaded", () => {
    // display the name of the logged in user, if it exists
    const username = localStorage.getItem('username');
    const userButton = document.getElementById('userButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutButton = document.getElementById('logoutButton');

    if (username) {
        document.getElementById('username').textContent = username;
        document.getElementById('loginLink').style.display = 'none';
        document.getElementById('createAccountLink').style.display = 'none';
        userButton.style.display = 'flex';
    } else {
        userButton.style.display = 'none';
    }

    // toggle dropdown
    if (userButton && dropdownMenu) {
        userButton.addEventListener("click", () => {
            dropdownMenu.classList.toggle("show");
        });

        // close dropdown when clicking outside
        window.addEventListener("click", (event) => {
            if (!userButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
                dropdownMenu.classList.remove("show");
            }
        });
    }

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem('username');
            window.location.href = "index.html";
        });
    }

    // check if the user is admin and display specific buttons
    const createButton = document.getElementById("createButton");
    if (username && createButton) {
        fetch("http://localhost:5000/api/check-admin", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        }).then(response => {
            if (response.ok) {
                document.getElementById('username').style.color = "#1255FF";
                createButton.style.display = "block";
            } else {
                document.getElementById('username').style.color = "#FFC107";
            }
        }).catch(error => console.error("Error checking admin:", error));
    }

    // upload movies and organize by genres
    fetch("http://localhost:5000/api/movies").then(async (response) => {
        const movies = await response.json();
        const genreSections = {
            "music": document.querySelector(".genre-section:nth-of-type(1) .carousel"),
            "Action": document.querySelector(".genre-section:nth-of-type(2) .carousel"),
            "Drama": document.querySelector(".genre-section:nth-of-type(3) .carousel"),
            "Animation": document.querySelector(".genre-section:nth-of-type(4) .carousel")
        };

        movies.forEach(movie => {
            const movieCard = document.createElement("div");
            movieCard.classList.add("card");
            movieCard.innerHTML = `
                <a href="movie-details.html?id=${movie._id}">
                <img src="${movie.poster}" alt="${movie.title}" onerror="this.src='placeholder-image.png';">
                <div class="rating">${generateStars(movie.rating)}</div>
            `;

            const primaryGenre = movie.genre[0];
            if (genreSections[primaryGenre]) {
                genreSections[primaryGenre].insertBefore(
                    movieCard,
                    genreSections[primaryGenre].querySelector(".next")
                );
            }
        });
    }).catch(error => console.error("Error fetching movies:", error));

    // generate stars according to the evaluation
    function generateStars(rating) {
        const starColors = ["#E35F53", "#FFE629", "#2BFF32", "#36F9E2", "#1255FF"]; 

        let stars = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                stars += `<span class="star" style="color: ${starColors[i - 1]}">&#9733;</span>`;
            } 
        }
        return stars;
    }

    // Function for the film submission form
    const movieForm = document.getElementById("movieForm");
    if (movieForm) {
        movieForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData();
            formData.append("title", document.getElementById("title").value);
            formData.append("genre", document.getElementById("genre").value);
            formData.append("rating", document.getElementById("rating").value);
            formData.append("year", document.getElementById("year").value);
            formData.append("type", document.querySelector('input[name="type"]:checked')?.value);
            formData.append("poster", document.getElementById("posterInput").files[0]);

            if (!localStorage.getItem("token")) {
                alert("You are not logged in.");
                return;
            }

            try {
                const response = await fetch("http://localhost:5000/api/movies", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    },
                    body: formData,
                });

                if (response.ok) {
                    alert("Movie added successfully!");
                    window.location.href = "main-page.html";
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.message || response.statusText}`);
                }
            } catch (error) {
                console.error("Error submitting form:", error);
                alert("An unexpected error occurred.");
            }
        });
    }

    // display selected image in poster container
    const posterInput = document.getElementById("posterInput");
    const posterPreview = document.getElementById("posterPreview");
    const posterImage = document.getElementById("posterImage");
    const removePosterButton = document.getElementById("removePosterButton");

    if (posterInput && posterPreview && posterImage && removePosterButton) {
        posterInput.addEventListener("change", () => {
            const file = posterInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    posterImage.src = e.target.result;
                    posterPreview.classList.remove("hidden");
                };
                reader.readAsDataURL(file);
            }
        });

        removePosterButton.addEventListener("click", () => {
            posterInput.value = "";
            posterImage.src = "";
            posterPreview.classList.add("hidden");
        });
    } else {
        console.error("Poster elements are missing in the DOM.");
    }
});
