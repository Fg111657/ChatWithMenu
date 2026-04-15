"""
Add this to server.py after the enrich_google endpoint
Photo proxy endpoint - securely serves Google Photos without exposing API key
"""

CODE = '''
@api_namespace.route('/restaurant/<int:restaurant_id>/photo/<int:photo_index>')
class RestaurantPhotoProxy(Resource):
    def get(self, restaurant_id, photo_index):
        """
        Proxy Google Photos without exposing API key to frontend
        Usage: GET /api/restaurant/:id/photo/0
        Returns: Image binary data
        """
        with GetDB() as db:
            restaurant = db.query(db_models.Restaurant).get(restaurant_id)
            if not restaurant or not restaurant.google_photo_refs:
                api.abort(404, "Restaurant or photos not found")

            try:
                photo_refs = json.loads(restaurant.google_photo_refs)
            except:
                api.abort(500, "Invalid photo data")

            if photo_index >= len(photo_refs):
                api.abort(404, "Photo index out of range")

            photo_ref = photo_refs[photo_index]

            # Fetch photo from Google (server-side only)
            google_url = google_places_helper.get_photo_url(photo_ref, max_width=800)
            if not google_url:
                api.abort(500, "Could not generate photo URL")

            try:
                # Download image from Google
                import requests
                photo_response = requests.get(google_url, timeout=10)
                photo_response.raise_for_status()

                # Return image with proper headers
                return Response(
                    photo_response.content,
                    mimetype='image/jpeg',
                    headers={
                        'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                        'Content-Type': 'image/jpeg'
                    }
                )
            except Exception as e:
                logger.error(f"Photo proxy error: {e}", exc_info=True)
                api.abort(500, "Failed to fetch photo from Google")
'''

print(CODE)
