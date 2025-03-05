function redirectTo(page) {
    window.location.href = page;
}

document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem('username');
    if (username) {
        document.getElementById('username').textContent = username;
        document.getElementById('loginLink').style.display = 'none';
        document.getElementById('createAccountLink').style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", () => {
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

    // toggle menu visibility when clicking on name
    userButton.addEventListener("click", () => {
        dropdownMenu.classList.toggle("show");
    });

    
    logoutButton.addEventListener("click", () => {
        localStorage.removeItem('username');
        window.location.href = "index.html";
    });

    // close dropdown if click outside
    window.addEventListener("click", (event) => {
        if (!userButton.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove("show");
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    const userSpan = document.getElementById("username");
    const createButton = document.getElementById("createButton");

    if (username) {
        userSpan.textContent = username;
        document.getElementById("loginLink").style.display = "none";
        document.getElementById("createAccountLink").style.display = "none";

        // checks if the user is admin
        try {
            const response = await fetch("http://localhost:5000/api/check-admin", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                userSpan.style.color = "#1255FF";
                createButton.style.display = "block";
            
            } else {
                userSpan.style.color = "#FFC107"; 
            }
        } catch (error) {
            console.error("Error when checking if the user is admin:", error);
        }
    }
});


document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch("http://localhost:5000/api/movies"); 
    const movies = await response.json();
    
    const genreSections = {
        "music": document.querySelector(".genre-section:nth-of-type(1) .carousel"),
        "Action": document.querySelector(".genre-section:nth-of-type(2) .carousel"),
        "drama": document.querySelector(".genre-section:nth-of-type(3) .carousel")
    };

    movies.forEach(movie => {
        const movieCard = document.createElement("div");
        movieCard.classList.add("card");
        movieCard.innerHTML = `
        <img src="${movie.poster}" alt="${movie.title}">
        <div class="rating">${generateStars(movie.rating)}</div>
        `;

        const primaryGenre = movie.genre[0];

        if (genreSections[primaryGenre]) {
            genreSections[primaryGenre].insertBefore(movieCard, genreSections[primaryGenre].querySelector(".next"));
        }
    });
});
function generateStars(rating) {
    const starColors = {
        1: "#E35F53",       
        2: "#FFE629",    
        3: "#2BFF32",     
        4: "#36F9E2",      
        5: ["#E35F53", "#FFE629", "#2BFF32", "#36F9E2", "#1255FF"] 
    };

    let stars = "";

    if (rating < 5) {
        for (let i = 0; i < rating; i++) {
            stars += `<span class="star star-${rating}">&#9733;</span>`;
        }
    } else {
        for (let i = 0; i < 5; i++) {
            stars += `<span class="star" style="color: ${starColors[5][i]}">&#9733;</span>`;
        }
    }

    return stars;
}

document.getElementById("createMovie").addEventListener("click", () => {
    window.location.href = "new-movie.html";
});


document.getElementById("movieForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const genre = document.getElementById("genre").value;
    const rating = document.getElementById("rating").value;
    const year = document.getElementById("year").value;
    const typeMovie = document.getElementById("typeMovie").checked;
    const typeSeries = document.getElementById("typeSeries").checked;
    const posterInput = document.getElementById("posterInput").files[0];

    if (!posterInput) {
        alert("Please upload a poster!");
        return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("genre", genre);
    formData.append("rating", rating);
    formData.append("year", year);
    formData.append("type", typeMovie ? "Movies" : typeSeries ? "Series" : "");
    formData.append("poster", posterInput);

    try {
        const response = await fetch("http://localhost:5000/api/movies", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            alert("Movie added successfully!");
            window.location.href = "main-page.html";
        } else {
            alert("Failed to add movie.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred.");
    }
});
