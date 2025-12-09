from rest_framework.views import APIView
from rest_framework.response import Response
from .engine import calculate_trip

class PlanTripView(APIView):
    def post(self, request):
        result = calculate_trip(request.data)
        return Response(result)