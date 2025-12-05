Comment je pense organiser les données pour les différentes parties du site.

1. ChatBot
```python
answerUserRequest()
# return str
# Une seule réponse par appel
```

2. Exercises
```python
getExercises()
# return : dict[ ID : dict[ 
#     question : str,
#     answer : str
#     propositions : list[ str, str, str ]
#     ] 
# ] # Il y aura plusieurs exercices donnés en même temps
```

3. Fiches de cours
```python
getRevisingSheets()
# return : dict[ ID : str ] #parce qu'on aura plusieurs fiches aussi
```