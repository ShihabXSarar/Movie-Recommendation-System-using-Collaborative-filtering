import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json
import bs4 as bs
import urllib.request
import pickle
import requests

# load the nlp model and tfidf vectorizer from disk
filename = 'nlp_model.pkl'
clf = pickle.load(open(filename, 'rb'))
vectorizer = pickle.load(open('transform.pkl','rb'))

def create_similarity():
    data = pd.read_csv('main_data.csv')
    # creating a count matrix
    cv = CountVectorizer()
    count_matrix = cv.fit_transform(data['comb'])
    # creating a similarity score matrix
    similarity = cosine_similarity(count_matrix)
    return data,similarity

def rcmd(m):
    m = m.lower()
    try:
        data.head()
        similarity.shape
    except:
        data, similarity = create_similarity()
    if m not in data['movie_title'].unique():
        return('Sorry! try another movie name')
    else:
        i = data.loc[data['movie_title']==m].index[0]
        lst = list(enumerate(similarity[i]))
        lst = sorted(lst, key = lambda x:x[1] ,reverse=True)
        lst = lst[1:11] # excluding first item since it is the requested movie itself
        l = []
        for i in range(len(lst)):
            a = lst[i][0]
            l.append(data['movie_title'][a])
        return l

# converting list of string to list (eg. "["abc","def"]" to ["abc","def"])

def convert_to_list(my_list):
    my_list = my_list.split('","')
    my_list[0] = my_list[0].replace('["','')
    my_list[-1] = my_list[-1].replace('"]','')
    return my_list


# to get suggestions of movies
def get_suggestions():
    data = pd.read_csv('main_data.csv')
    return list(data['movie_title'].str.capitalize())

# Flask API

app = Flask(__name__)

@app.route("/")
@app.route("/home")
def home():
    suggestions = get_suggestions()
    return render_template('home.html',suggestions=suggestions)

@app.route("/similarity",methods=["POST"])
def similarity():
    movie = request.form['name']
    rc = rcmd(movie)
    if type(rc)==type('string'):
        return rc
    else:
        m_str="---".join(rc)
        return m_str


@app.route("/recommend", methods=["POST"])
def recommend():
    try:
        # Ensure request is correctly used
        title = request.form.get('title', 'Unknown')
        cast_ids = request.form.get('cast_ids', '[]')
        cast_names = request.form.get('cast_names', '[]')
        cast_chars = request.form.get('cast_chars', '[]')
        cast_bdays = request.form.get('cast_bdays', '[]')
        cast_bios = request.form.get('cast_bios', '[]')
        cast_places = request.form.get('cast_places', '[]')
        cast_profiles = request.form.get('cast_profiles', '[]')
        imdb_id = request.form.get('imdb_id', 'N/A')
        tmdb_id = request.form.get('tmdb_id', 'N/A')  # TMDB ID to fetch reviews
        poster = request.form.get('poster', '')
        genres = request.form.get('genres', 'Unknown')
        overview = request.form.get('overview', 'No overview available.')
        vote_average = request.form.get('rating', 'N/A')
        vote_count = request.form.get('vote_count', '0')
        release_date = request.form.get('release_date', 'N/A')
        runtime = request.form.get('runtime', 'N/A')
        status = request.form.get('status', 'Unknown')
        rec_movies = request.form.get('rec_movies', '[]')
        rec_posters = request.form.get('rec_posters', '[]')

        # Convert string lists to actual lists
        rec_movies = convert_to_list(rec_movies)
        rec_posters = convert_to_list(rec_posters)
        cast_names = convert_to_list(cast_names)
        cast_chars = convert_to_list(cast_chars)
        cast_profiles = convert_to_list(cast_profiles)
        cast_bdays = convert_to_list(cast_bdays)
        cast_bios = convert_to_list(cast_bios)
        cast_places = convert_to_list(cast_places)

        # Convert cast_ids to a proper list
        cast_ids = cast_ids.strip("[]").split(',')

        # Ensure movie posters and titles match correctly
        movie_cards = {rec_posters[i]: rec_movies[i] for i in range(len(rec_movies))}

        # Create dictionaries for cast information
        casts = {cast_names[i]: [cast_ids[i], cast_chars[i], cast_profiles[i]] for i in range(len(cast_profiles))}
        cast_details = {cast_names[i]: [cast_ids[i], cast_profiles[i], cast_bdays[i], cast_places[i], cast_bios[i]] for
                        i in range(len(cast_places))}

        # Fetch user reviews from TMDB API
        api_key = "514500528da8f14e56884da74c72918c"  # Your TMDB API Key
        tmdb_url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/reviews?api_key={api_key}&language=en-US&page=1"

        try:
            response = requests.get(tmdb_url)
            if response.status_code == 200:
                data = response.json()
                reviews_list = []
                reviews_status = []

                for review in data.get("results", []):
                    reviews_list.append(review["content"])
                    # Passing the review to our model for sentiment analysis
                    movie_review_list = np.array([review["content"]])
                    movie_vector = vectorizer.transform(movie_review_list)
                    pred = clf.predict(movie_vector)
                    reviews_status.append("Good" if pred else "Bad")

                # Combine reviews and their sentiment into a dictionary
                movie_reviews = {reviews_list[i]: reviews_status[i] for i in range(len(reviews_list))}
            else:
                print(f"Failed to fetch TMDB reviews. Status Code: {response.status_code}")
                movie_reviews = {}

        except Exception as e:
            print(f"Error fetching TMDB reviews: {e}")
            movie_reviews = {}

        # Pass all data to the template
        return render_template(
            'recommend.html',
            title=title, poster=poster, overview=overview,
            vote_average=vote_average, vote_count=vote_count,
            release_date=release_date, runtime=runtime, status=status, genres=genres,
            movie_cards=movie_cards, reviews=movie_reviews, casts=casts, cast_details=cast_details
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
