from flask import Flask, render_template , url_for
app = Flask(__name__ ,static_folder='static', static_url_path='/static')

@app.route("/")
def index():
    # Render the first HTML page
    return render_template("accident_index.html")

@app.route("/accident")
def accident():
    # Render the second HTML page
    return render_template("accident.html")


if __name__ == "__main__":
    app.run(debug=True)
