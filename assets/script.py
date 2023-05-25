import json

def transform_coordinates(coordinate_list):
    return [{"lat": c[1], "lon": c[0]} for c in coordinate_list]

with open('data.json', 'r') as f:
    data = json.load(f)

new_features = []

for feature in data['features']:
    new_feature = feature.copy()
    new_feature['geometry']['coordinates'] = [transform_coordinates(poly) for poly in feature['geometry']['coordinates']]
    new_features.append(new_feature)

data['features'] = new_features

with open('data2.json', 'w') as f:
    json.dump(data, f, indent=4)